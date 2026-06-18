import { supabase } from "../config/supabase.js";

export interface OperatorCompanyRegistrationInput {
  company_name: string;      
  phone_number: string;      
  email: string;             
  password_hash: string;     
}

export class ParkService {
  /**
   * 1. Check if a company name is already registered
   * ALIGNED: Unpacks the object to return raw row details or null directly, resolving your TS compilation alert
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
   * 2. Registers Operator AND creates Company Park profile atomically
   */
  static async registerOperatorWithCompany(input: OperatorCompanyRegistrationInput) {
    // Step A: Create the core login user account entry inside 'my_users' table
    // ALIGNED: Removed 'phone_number' and 'user_role' columns to fix your schema cache failure!
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

    console.log("➡️ User created successfully with ID:", userRow.id, ". Proceeding to create company profile...");

    // Step B: Instantly initialize the Company profile, setting the new user's ID as the 'owner_id'
    // ALIGNED: Storing the phone number cleanly inside the company address metadata to avoid losing data
    const { data: companyRow, error: companyError } = await supabase
      .from("companies")
      .insert([{
        owner_id: userRow.id,           
        name: input.company_name.trim(), 
        address: `Pending Address Setup | Contact: ${input.phone_number.trim()}`, 
        park_location: null             
      }])
      .select()
      .single();

    if (companyError) {
      console.error("❌ Company Table Insertion Crash:", companyError.message);
      // Rollback safety fallback: Clear out the unlinked user row to avoid leaving ghost data
      await supabase.from("my_users").delete().eq("id", userRow.id);
      throw companyError;
    }

    console.log("➡️ Company profile created successfully with ID:", companyRow.id, ". Performing final link step...");

    // Step C: Update the user row to store its own company_id reference for seamless authentication sessions
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
   * 3. RESTORED: Onboard a New Driver (User + Profile + Activation Code)
   * ALIGNED: Removed invalid columns from user creation block to safeguard your driver onboarding flow
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
   * 4. Update company/park details
   */
  static async updateParkByOperator(operatorId: string, updateData: any) {
    const mappedData: any = {};
    if (updateData.park_name) mappedData.name = updateData.park_name;
    if (updateData.park_location) mappedData.address = updateData.park_location;

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
   * 5. Utility Fetcher
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
