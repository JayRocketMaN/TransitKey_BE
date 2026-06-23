import { supabase } from "../config/supabase.js";

export class DashboardService {
  /**
   * Compiles counters and live tracking table records for a specific company
   */
  static async getCompanyTelemetry(companyId: string) {
    // 1. Count active drivers assigned to this operator's park
    const { count: activeDrivers, error: driverCountError } = await supabase
      .from("driver_profiles")
      .select("*", { count: "exact", head: true })
      .eq("park_id", companyId);

    if (driverCountError) throw driverCountError;

    // 2. Count total trip entries registered under this company identifier
    const { count: totalTrips, error: tripCountError } = await supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    if (tripCountError) throw tripCountError;

    // 3. Fetch non-completed operational items matching your exact database schema fields
    const { data: activeTrips, error: tripsError } = await supabase
      .from("trips")
      .select(`
        id,
        bus_id,
        origin_name,
        destination_name,
        price,
        ride_status,
        occupied_seats,
        total_seats,
        started_at,
        driver_id,
        driver_profiles (
          full_name,
          phone_number
        )
      `)
      .eq("company_id", companyId)
      .neq("ride_status", "completed") 
      .order("created_at", { ascending: false });

    if (tripsError) throw tripsError;

    // 4. Return clean data structure configured exactly for UI data mapping grids
    return {
      metrics: {
        active_drivers: activeDrivers || 0,
        total_trips: totalTrips || 0,
        pending_complaints: 18 // Mocked panel metric standard configuration metric
      },
      active_trips: activeTrips.map((trip: any) => ({
        id: trip.id,
        driver_name: trip.driver_profiles ? trip.driver_profiles.full_name : "Unassigned Driver",
        driver_phone: trip.driver_profiles ? trip.driver_profiles.phone_number : "N/A",
        plate_number: trip.bus_id,
        origin: trip.origin_name,
        destination: trip.destination_name,
        fare: trip.price,
        status: trip.ride_status,
        seats_filled: `${trip.occupied_seats}/${trip.total_seats}`,
        started_at: trip.started_at
      }))
    };
  }
}
