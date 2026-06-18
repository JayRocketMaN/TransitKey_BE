import { supabase } from "../config/supabase.js";

// Strictly typed to match your database CHECK constraint rule exactly
type TripStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface TripInput {
  driver_id: string;
  company_id: string;
  bus_id: string; 
  origin_name: string;
  destination_name: string;
  price: number;
  total_seats: number;
}

export class TripService {
  /**
   * Handshake: Transition trip from 'scheduled' to 'in-progress' via RPC.
   * FIXED: Passes raw decimal float attributes directly to the updated database stored procedure.
   */
  static async startTrip(tripId: string, startLat: number, startLng: number) {
    const { data, error } = await supabase.rpc('start_trip_transaction', {
      p_trip_id: tripId,
      p_lat: parseFloat(startLat as any), // Enforces clean double-precision floating numbers
      p_lng: parseFloat(startLng as any)  
    });

    if (error) throw new Error(`Handshake failed: ${error.message}`);
    return { data, error: null };
  }

  /**
   * Creates/Schedules a new journey transit manifest
   * FIXED: First parameter renamed to 'companyId' to align with your controller updates and table constraints.
   */
  static async createTrip(companyId: string, data: TripInput) {
    const { data: trip, error } = await supabase
      .from("trips")
      .insert([{
        driver_id: data.driver_id,
        company_id: companyId, // Satisfies your fk_company rules natively
        bus_id: data.bus_id, 
        origin_name: data.origin_name,
        destination_name: data.destination_name,
        price: data.price,
        total_seats: data.total_seats,
        ride_status: "scheduled"
      }])
      .select()
      .maybeSingle(); 

    return { data: trip, error };
  }

  /**
   * Updates an ongoing trip status layout
   */
  static async updateTripStatus(tripId: string, status: TripStatus) {
    const { data, error } = await supabase
      .from("trips")
      .update({ ride_status: status })
      .eq("id", tripId)
      .select()
      .maybeSingle();

    return { data, error };
  }

  /**
   * Get active company fleet trip dashboard manifests
   * FIXED: Joined tables query updated from 'my_users' to 'driver_profiles' to match schema changes.
   */
  static async getActiveTripsByCompany(companyId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        *,
        driver_profiles:driver_id (
          full_name,
          phone_number,
          bus_plate_number
        )
      `)
      .eq("company_id", companyId)
      .neq("ride_status", "completed")
      .order("created_at", { ascending: false });

    return { data, error };
  }

  /**
   * FIGMA FEATURE: Upcoming Trips Summary Dashboard Component
   * Fetches all confirmed or pending trip bookings assigned specifically to the logged-in passenger
   */
  static async getPassengerUpcomingSummary(userId: string) {
    // Queries your bookings table, joins the parent trip metrics, and sorts by departure timeline
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        seat_number,
        booking_status,
        created_at,
        trips:trip_id (
          id,
          origin_name,
          destination_name,
          price,
          ride_status,
          started_at
        )
      `)
      .eq("user_id", userId)
      .or("booking_status.eq.booked,booking_status.eq.confirmed") // Shows pending holds and paid slots
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Formats and flattens the output structure to align exactly with your Figma UI list columns
    return (data || []).map((b: any) => ({
      booking_id: b.id,
      seat_number: b.seat_number,
      status: b.booking_status.toUpperCase(), // Returns 'CONFIRMED' or 'PENDING' (booked hold)
      route: `${b.trips?.origin_name} ➔ ${b.trips?.destination_name}`,
      date_time: b.trips?.started_at || "TBD"
    }));
  }

  /**
   * FIGMA UI FEATURE: Handles the "Quick Route Search" Form (From -> To)
   * Searches for static routes matching terminal names, and joins active live trip deployments
   */
  static async searchLiveTripsByTerminals(startTerminal: string, endTerminal: string) {
    if (!startTerminal || !endTerminal) {
      throw new Error("Both start and end terminals are required to run a quick search.");
    }

    // 1. Query the routes table using case-insensitive text matching (ilike)
    // 2. Joins the 'trips' table to pull active, un-departed vehicles assigned to this route path
    const { data, error } = await supabase
      .from("routes")
      .select(`
        id,
        route_name,
        start_terminal,
        end_terminal,
        fare,
        distance_km,
        duration_minutes,
        companies (
          name
        ),
        trips!inner (
          id,
          bus_id,
          ride_status,
          total_seats,
          occupied_seats,
          started_at
        )
      `)
      .ilike("start_terminal", `%${startTerminal.trim()}%`)
      .ilike("end_terminal", `%${endTerminal.trim()}%`)
      .eq("trips.ride_status", "scheduled") // 🧠 Only pull buses that haven't left the station yet!
      .order("route_name", { ascending: true });

    if (error) throw error;

    // Flatten the response payload structure to make it clean for your frontend team
    return (data || []).map((route: any) => ({
      route_id: route.id,
      route_name: route.route_name,
      start_terminal: route.start_terminal,
      end_terminal: route.end_terminal,
      distance: route.distance_km,
      duration: route.duration_minutes,
      company_name: route.companies?.name || "Independent Fleet",
      available_buses: (route.trips || []).map((trip: any) => ({
        trip_id: trip.id,
        bus_identifier: trip.bus_id,
        status: trip.ride_status,
        price: route.fare, // Inherits pricing metrics from the core path
        seats_available: (trip.total_seats || 14) - (trip.occupied_seats || 0)
      }))
    }));
  }
} // 🧠 Final closing brace containing all class declarations!
