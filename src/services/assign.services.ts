import { supabase } from "../config/supabase.js";

export class AssignmentService {
  /**
   * Checks if a driver is currently linked to any vehicle
   */
  static async checkDriverBusy(driverId: string) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id")
      .eq("current_driver_id", driverId)
      .maybeSingle();

    return { data, error }; // Returns object matching the controller checks
  }

  /**
   * Basic assignment of a driver to a vehicle
   */
  static async assignDriverToVehicle(vehicleId: string, driverId: string | null) {
    const { data, error } = await supabase
      .from("vehicles")
      .update({ 
        current_driver_id: driverId, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", vehicleId)
      .select()
      .maybeSingle();

    return { data, error }; // Returns object matching the controller checks
  }

  /**
   * Forcefully removes a driver from any vehicle they are currently assigned to
   */
  static async unassignDriverFromAnyVehicle(driverId: string) {
    return await supabase
      .from("vehicles")
      .update({ 
        current_driver_id: null, 
        updated_at: new Date().toISOString() 
      })
      .eq("current_driver_id", driverId);
  }

  /**
   * ROTATION LOGIC
   */
  static async rotateDriver(vehicleId: string, driverId: string) {
    const { error: releaseError } = await this.unassignDriverFromAnyVehicle(driverId);
    if (releaseError) return { data: null, error: releaseError };

    return await this.assignDriverToVehicle(vehicleId, driverId);
  }

  /**
   * Gets all active assignments for an operator's fleet
   */
  static async getOperatorFleet() {
    const { data, error } = await supabase
      .from("vehicles")
      .select(`
        id,
        plate_number,
        vehicle_model,
        current_driver_id,
        driver_profiles (
          id,
          phone_number,
          license_number
        )
      `)
      .not("current_driver_id", "is", null);

    return { data, error };
  }

  /**
   * Finds the vehicle currently assigned to a specific driver
   */
  static async getDriverAssignment(driverId: string) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, plate_number, vehicle_model, status")
      .eq("current_driver_id", driverId)
      .maybeSingle();

    return { data, error };
  }
}
