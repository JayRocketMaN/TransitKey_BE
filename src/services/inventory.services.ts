import { supabase } from "../config/supabase.js";

export interface VehicleInput {
  park_id?: string;
  park_operator_id?: string;
  bus_id?: string;
  plate_number: string;
  capacity?: number;
  vehicle_model?: string;
  status?: string;
}

export class VehicleService {
  /**
   * Points to 'companies' table and 'owner_id' column to look up park info
   */
  static async getParkByOperator(operatorId: string) {
    return await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", operatorId)
      .maybeSingle();
  }

  /**
   * Validates if a plate number is already registered
   */
  static async checkDuplicatePlate(plateNumber: string, excludeId?: string) {
    let query = supabase
      .from("vehicles")
      .select("id")
      .eq("plate_number", plateNumber);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    
    return await query.maybeSingle();
  }

  /**
   * Computes total registered assets(vehicles) within a specific park 
   */
  static async getVehicleCountInPark(parkId: string) {
    const { count, error } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("park_id", parkId);
      
    return { count, error };
  }

  /**
   * Saves a structured vehicle configuration payload to the database
   */
  static async createVehicle(data: VehicleInput) {
    return await supabase
      .from("vehicles")
      .insert([data]);
  }

  /**
   * Fetches all registered vehicles belonging to the operator's park fleet sorted by newest first
   */
  static async getVehiclesByOperator(operatorId: string) {
    return await supabase
      .from("vehicles")
      .select("*")
      .eq("park_operator_id", operatorId)
      .order("created_at", { ascending: false });
  }

  /**
   * Modifies an existing vehicle asset profile configuration parameters matching operator credentials
   */
  static async updateVehicle(vehicleId: string, operatorId: string, updateData: Partial<VehicleInput>) {
    return await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", vehicleId)
      .eq("park_operator_id", operatorId)
      .select()
      .maybeSingle();
  }
}
