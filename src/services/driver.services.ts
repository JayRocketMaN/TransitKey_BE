import { supabase } from "../config/supabase.js";


export interface DriverInput {
  full_name: string;            
  email?: string;                      
  phone?: string;
  phone_number?: string;
  license?: string;
  license_number?: string;
  license_type?: 'Commercial Driver License' | 'Heavy Duty License' | 'Public Transport License';
  bus_plate_number?: string;
  bus_type?: 'BRT(Bus Rapid Transit)' | 'Danfo' | 'Luxury Coach' | 'Mini Bus' | 'Shuttle';
  vehicle_class?: string;
  years_of_experience: number;
}

export class DriverService {
  /**
   *Find driver by phone_number column
   */
  static async findDriverByPhone(phone: string) {
    return await supabase
      .from("driver_profiles")
      .select()
      .eq("phone_number", phone) 
      .maybeSingle();
  }

  /**
   *Get the Company/Park ID
   */
  static async getParkByOperatorId(operatorId: string) {
    return await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", operatorId)
      .maybeSingle();
  }

  /**
   *Create Driver 
   */
  static async createDriver(driverData: any, parkId: string) {
    const insertData = {
      park_id: parkId,
      user_id: driverData.user_id || null, 
      full_name: driverData.full_name,                     
      email: driverData.email || null,                   
      phone_number: driverData.phone_number || driverData.phone || null,
      bus_plate_number: driverData.bus_plate_number || null,
      bus_type: driverData.bus_type || null,               
      license_number: driverData.license || driverData.license_number || null,
      license_type: driverData.license_type || null
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
   *List drivers - Optimized to order by full_name search index
   */
  static async getDriversByPark(parkId: string) {
    return await supabase
      .from("driver_profiles")
      .select("*")
      .eq("park_id", parkId)
      .order("full_name", { ascending: true });            
  }

  /**
   *Update Driver
   */
  static async updateDriver(id: string, updateData: any) {
    const mappedUpdate: any = {};
    
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
   *Get a Single Driver Profile by ID
   */
  static async getDriverById(id: string) {
    return await supabase
      .from("driver_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  }
}
