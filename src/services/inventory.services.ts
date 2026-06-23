import { supabase } from "../config/supabase.js";

export interface VehicleInput {
  park_id: string;          
  park_operator_id: string; // Restored to match your active schema columns
  bus_id: string;           // Marked as strict string to pass the NOT NULL constraint
  plate_number: string;     
  capacity?: number;        
  vehicle_model?: string;   
  status?: string; 
}

export class VehicleService {
  /**
   * Points to 'companies' table and 'owner_id' column to look up parent company/park metrics
   */
  static async getParkByOperator(operatorId: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", operatorId)
      .maybeSingle();

    if (error) {
      console.error("[VehicleService.getParkByOperator] Database Error:", error.message);
      throw error;
    }
    return data;
  }

  /**
   * Validates if a vehicle plate number is already registered inside your unique database constraint index
   */
  static async checkDuplicatePlate(plateNumber: string, excludeId?: string) {
    let query = supabase
      .from("vehicles")
      .select("id, plate_number")
      .eq("plate_number", plateNumber.trim().toUpperCase());

    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[VehicleService.checkDuplicatePlate] Database Error:", error.message);
      throw error;
    }
    return data;
  }

  /**
   * Computes total registered assets within a specific park boundary to create sequential IDs
   */
  static async getVehicleCountInPark(parkId: string | null | undefined) {
    if (!parkId) return { count: 0, error: null };

    const { count, error } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("park_id", parkId);
      
    if (error) {
      console.error("[VehicleService.getVehicleCountInPark] Database Error:", error.message);
      throw error;
    }
    return { count: count || 0, error: null };
  }

  /**
   * Saves a clean vehicle asset registry entry straight into your database table
   */
  static async createVehicle(data: VehicleInput) {
    const { data: newVehicle, error } = await supabase
      .from("vehicles")
      .insert([{
        park_id: data.park_id,
        park_operator_id: data.park_operator_id,
        bus_id: data.bus_id, // Satisfies NOT NULL constraint safely
        plate_number: data.plate_number.trim().toUpperCase(),
        capacity: data.capacity || 14, // Matches your table default value of 14 seats
        vehicle_model: data.vehicle_model || "Standard Bus",
        status: data.status || "active",
        updated_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle();

    if (error) {
      console.error("[VehicleService.createVehicle] Database Error:", error.message);
    }
    return { data: newVehicle, error };
  }

  /**
   * Fetches all registered vehicles belonging directly to the operator's park fleet
   */
  static async getVehiclesByPark(parkId: string | null | undefined) {
    if (!parkId) return { data: [], error: null };

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("park_id", parkId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[VehicleService.getVehiclesByPark] Database Error:", error.message);
    }
    return { data: data || [], error };
  }

  /**
   * Modifies an existing vehicle asset profile configuration parameters matching verified operator credentials
   */
  static async updateVehicle(
    vehicleId: string, 
    parkId: string | null | undefined, 
    updateData: Partial<Omit<VehicleInput, "park_id" | "park_operator_id" | "bus_id">>
  ) {
    if (!parkId || !vehicleId) {
      return { data: null, error: new Error("Missing structural primary key updates context.") };
    }

    const sanitizedPayload: Record<string, any> = { 
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    if (updateData.plate_number) {
      sanitizedPayload.plate_number = updateData.plate_number.trim().toUpperCase();
    }

    const { data: updatedVehicle, error } = await supabase
      .from("vehicles")
      .update(sanitizedPayload)
      .eq("id", vehicleId)
      .eq("park_id", parkId) 
      .select()
      .maybeSingle();

    if (error) {
      console.error("[VehicleService.updateVehicle] Database Error:", error.message);
    }
    return { data: updatedVehicle, error };
  }
}
