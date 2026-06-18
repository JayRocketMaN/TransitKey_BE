import { supabase } from "../config/supabase.js";

// Updated to enforce full_name and allow explicit Enum/Email typing
export interface DriverInput {
  full_name: string;                   // Required matching your NOT NULL constraint
  email?: string;                      // Added email support
  phone?: string;
  phone_number?: string;
  license?: string;
  license_number?: string;
  // Strictly typed using your defined PostgreSQL Enum strings
  license_type?: 'Commercial Driver License' | 'Heavy Duty License' | 'Public Transport License';
  bus_plate_number?: string;
  bus_type?: 'BRT(Bus Rapid Transit)' | 'Danfo' | 'Luxury Coach' | 'Mini Bus' | 'Shuttle';
  vehicle_class?: string;
  years_of_experience: number;
}

export class DriverService {
  /**
   * 1. Find driver by phone_number column
   */
  static async findDriverByPhone(phone: string) {
    return await supabase
      .from("driver_profiles")
      .select()
      .eq("phone_number", phone) 
      .maybeSingle();
  }

  /**
   * 2. Get the Company/Park ID
   */
  static async getParkByOperatorId(operatorId: string) {
    return await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", operatorId)
      .maybeSingle();
  }

  /**
   * 3. Create Driver - Mapping ALL fields to avoid NULLs
   */
  static async createDriver(driverData: any, parkId: string) {
    // Explicit mapping including your new mandatory full_name and email columns
    const insertData = {
      park_id: parkId,
      user_id: driverData.user_id || null, 
      full_name: driverData.full_name,                     // Added: Strict database mapping
      email: driverData.email || null,                     // Added: RegEx validation safe
      phone_number: driverData.phone_number || driverData.phone || null,
      bus_plate_number: driverData.bus_plate_number || null,
      bus_type: driverData.bus_type || null,               // Must match strict custom Enums
      license_number: driverData.license || driverData.license_number || null,
      license_type: driverData.license_type || null,       // Must match strict custom Enums
      vehicle_class: driverData.vehicle_class || null,
      years_of_experience: parseInt(driverData.years_of_experience) || 0,
    };

    const { data, error } = await supabase
      .from("driver_profiles")
      .insert([insertData])
      .select()
      .single();

    return { data, error };
  }

  /**
   * 4. List drivers - Optimized to order by full_name search index
   */
  static async getDriversByPark(parkId: string) {
    return await supabase
      .from("driver_profiles")
      .select("*")
      .eq("park_id", parkId)
      .order("full_name", { ascending: true });            // Leverages your new index for sorted UI lists
  }

  /**
   * 5. Update Driver
   */
  static async updateDriver(id: string, updateData: any) {
    const mappedUpdate: any = {};
    
    // Explicitly allow updates for your new identity schema fields
    if (updateData.full_name) mappedUpdate.full_name = updateData.full_name;
    if (updateData.email) mappedUpdate.email = updateData.email;
    if (updateData.bus_plate_number) mappedUpdate.bus_plate_number = updateData.bus_plate_number;
    if (updateData.bus_type) mappedUpdate.bus_type = updateData.bus_type;
    if (updateData.vehicle_class) mappedUpdate.vehicle_class = updateData.vehicle_class;
    if (updateData.years_of_experience) mappedUpdate.years_of_experience = parseInt(updateData.years_of_experience) || 0;

    // Normalize phone formatting inputs
    if (updateData.phone || updateData.phone_number) {
      mappedUpdate.phone_number = updateData.phone ?? updateData.phone_number;
    }

    // Map license variations to database structure
    if (updateData.license || updateData.license_number) {
      mappedUpdate.license_number = updateData.license ?? updateData.license_number;
    }

    if (updateData.license_type) {
      mappedUpdate.license_type = updateData.license_type;
    }

    return await supabase
      .from("driver_profiles")
      .update(mappedUpdate)
      .eq("id", id)
      .select()
      .single();
  }

  /**
   * 6. Get a Single Driver Profile by ID
   */
  static async getDriverById(id: string) {
    return await supabase
      .from("driver_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  }
}
