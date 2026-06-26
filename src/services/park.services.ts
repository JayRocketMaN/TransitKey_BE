import { supabase } from "../config/supabase.js";
import bcrypt from 'bcryptjs';

export interface OperatorCompanyRegistrationInput {
  company_name: string;      
  phone_number: string;      
  email: string;             
  password_hash: string;     
  cac_registration_number: string; 
}

export class ParkService {
  
  // ==========================================
  // INTERNAL GEOMETRIC UTILITY METHODS
  // ==========================================

  /**
   * Automatically resolve geographic float coordinates from a text address string.
   * Connects cleanly to the open-source OpenStreetMap Nominatim Engine.
   */
  private static async geocodeAddressText(addressText: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log(`📡 Resolving PostGIS spatial mapping coordinates for: "${addressText}"...`);
      
      // Nominatim requires an explicit User-Agent string header setup to bypass default system rate limiting blocks
      const response = await fetch(
        `https://openstreetmap.org{encodeURIComponent(addressText)}&format=json&limit=1`,
        { headers: { "User-Agent": "TransitKey_Logistics_Engine/1.0" } }
      );

      if (!response.ok) return null;
      const data = await response.json() as any[];

      if (data && data.length > 0) {
        const match = data[0];
        return {
          lat: parseFloat(match.lat),
          lng: parseFloat(match.lon) // Longitude maps natively to 'lon' in the Nominatim response
        };
      }
      return null;
    } catch (err) {
      console.error("⚠️ Automated Address Geocoding Handshake Failure:", err);
      return null;
    }
  }

  // ==========================================
  // BUSINESS OPERATIONS & WORKSPACE METHODS
  // ==========================================

  /**
   * Check if a company name is already registered
   */
  static async findParkByName(name: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("name", name.trim())
      .maybeSingle();

    if (error) throw error;
    return data; 
  }

  /**
   * Registers Operator AND creates Company Park profile atomically
   */
  static async registerOperatorWithCompany(input: OperatorCompanyRegistrationInput) {
    const { data: userRow, error: userError } = await supabase
      .from("my_users")
      .insert([{
        email: input.email.trim().toLowerCase(),
        full_name: input.company_name.trim(), 
        password_hash: input.password_hash,
        role: "admin"
      }])
      .select()
      .single();

    if (userError) {
      console.error("❌ User Account Insertion Crash:", userError.message);
      throw userError;
    }

    console.log("User created successfully with ID:", userRow.id, ". Proceeding to create company profile...");

    // Instantly initialize the Company profile, setting the new user's ID as the 'owner_id'
    const { data: companyRow, error: companyError } = await supabase
      .from("companies")
      .insert([{
        owner_id: userRow.id,           
        name: input.company_name.trim(), 
        address: `Pending Address Setup | Contact: ${input.phone_number.trim()}`, 
        park_location: null, // Left as null on initial onboarding signups
        cac_registration_number: input.cac_registration_number.trim() 
      }])
      .select()
      .single();

    if (companyError) {
      console.error("❌ Company Table Insertion Crash:", companyError.message);
      // Clear out the unlinked user row to avoid leaving ghost data
      await supabase.from("my_users").delete().eq("id", userRow.id);
      throw companyError;
    }

    console.log("Company profile created successfully with ID:", companyRow.id, ". Performing final link step...");

    // Update the user row to store its own company_id reference for seamless authentication sessions
    const { error: linkError } = await supabase
      .from("my_users")
      .update({ 
        company_id: companyRow.id,
        role: "admin" 
      })
      .eq("id", userRow.id);

    if (linkError) {
      console.error("❌ Final Session Linking Failure:", linkError.message);
    }

    return {
      operator_id: userRow.id,
      company_id: companyRow.id,
      email: userRow.email,
      company_name: companyRow.name
    };
  }

  /**
   * Onboard a New Driver (User + Profile + Activation Code)
   */
  static async createDriverWithProfile(operator: any, formData: any) {
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resolvedCompanyId = operator.company_id || operator.id;
    
    const { data: user, error: userError } = await supabase
      .from('my_users')
      .insert([{
        email: formData.email,
        full_name: formData.full_name,
        password_hash: 'PENDING_ACTIVATION', 
        role: 'driver',
        company_id: resolvedCompanyId, 
        activation_code: activationCode
      }])
      .select().single();

    if (userError) throw userError;

    const { error: profileError } = await supabase
      .from('driver_profiles')
      .insert([{
        user_id: user.id,
        park_id: resolvedCompanyId,                         
        full_name: formData.full_name,                       
        email: formData.email || null,                       
        phone_number: formData.phone_number, 
        bus_plate_number: formData.bus_plate_number,
        bus_type: formData.bus_type || null,                 
        license_number: formData.license_number,
        license_type: formData.license_type || null,         
        vehicle_class: formData.vehicle_class,
        years_of_experience: parseInt(formData.years_of_experience) || 0
      }]);

    if (profileError) throw profileError;

    return activationCode;
  }

  /**
   * Processes self-service driver validation based on the 6-digit Operator/Activation Code.
   * Securely hashes incoming passwords using bcrypt before writing to public.my_users.
   */
  static async finalizeDriverOnboardingTransaction(operatorCode: string, passwordHash: string, phone: string) {
    const { data: userRow, error: findError } = await supabase
      .from("my_users")
      .select("id, email, full_name, company_id")
      .eq("activation_code", operatorCode.trim())
      .eq("role", "driver")
      .maybeSingle();

    if (findError) throw findError;
    
    if (!userRow) {
      throw new Error("Invalid or expired 6-digit Operator Code. Please contact your park dispatcher.");
    }

    // 🔥 Securely hash cleartext string before database update transactions
    const saltRounds = 10;
    const encryptedPassword = await bcrypt.hash(passwordHash, saltRounds);

    const { data: updatedUser, error: updateError } = await supabase
      .from("my_users")
      .update({
        password_hash: encryptedPassword,
        phone_number: phone.trim(),
        is_activated: true,         
        activation_code: null       
      })
      .eq("id", userRow.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Driver Validation Mutation Failure:", updateError.message);
      throw updateError;
    }

    await supabase
      .from("driver_profiles")
      .update({ phone_number: phone.trim() })
      .eq("user_id", userRow.id);

    return updatedUser;
  }

  /**
   * Update company/park details & convert text addresses to native PostGIS Geography points automatically
   */
  static async updateParkByOperator(operatorId: string, updateData: any) {
    const mappedData: any = {};
    if (updateData.park_name) mappedData.name = updateData.park_name;
    if (updateData.park_location) mappedData.address = updateData.park_location;
    if (updateData.cac_registration_number) mappedData.cac_registration_number = updateData.cac_registration_number;

    // --- INTERCEPT INCOMING DATA GRID TO POPULATE THE GEOGRAPHY POINT ---
    let finalLat = updateData.lat;
    let finalLng = updateData.lng;

    if ((finalLat == null || finalLng == null) && updateData.park_location) {
      const geoResult = await this.geocodeAddressText(updateData.park_location);
      if (geoResult) {
        finalLat = geoResult.lat;
        finalLng = geoResult.lng;
        console.log(`🎯 Auto-mapped database coordinates successfully: Lat ${finalLat}, Lng ${finalLng}`);
      } else {
        console.warn("⚠️ Geocoder returned 0 results. park_location field will default to NULL.");
      }
    }

    if (finalLat != null && finalLng != null) {
      mappedData.park_location = `SRID=4326;POINT(${parseFloat(finalLng)} ${parseFloat(finalLat)})`;
    }

    const { data, error } = await supabase
      .from("companies")
      .update(mappedData)
      .eq("owner_id", operatorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Utility Fetcher
   */
  static async getParkByOperator(operatorId: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", operatorId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
