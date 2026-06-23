import { supabase } from "../config/supabase.js";

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
   */
  static async createTrip(companyId: string, data: TripInput) {
    const { data: trip, error } = await supabase
      .from("trips")
      .insert([{
        driver_id: data.driver_id,
        company_id: companyId, 
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
   * Refactored to dynamically record timestamps and match your notification trigger requirements.
   */
  static async updateTripStatus(tripId: string, status: TripStatus) {
    const updatePayload: Record<string, any> = { 
      ride_status: status,
      updated_at: new Date().toISOString()
    };

    // Safely capture vehicle dispatch timestamps for live map views
    if (status === "in-progress") {
      updatePayload.started_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("trips")
      .update(updatePayload)
      .eq("id", tripId)
      .select()
      .maybeSingle();

    return { data, error };
  }

  /**
   * Get active company fleet trip dashboard manifests
   */
  static async getActiveTripsByCompany(companyId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        *,
        driver_profiles:driver_id (
          full_name,
          phone_number
        )
      `)
      .eq("company_id", companyId)
      .neq("ride_status", "completed")
      .order("created_at", { ascending: false });

    return { data, error };
  }

  /**
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
    
    return (data || []).map((b: any) => ({
      booking_id: b.id,
      seat_number: b.seat_number,
      status: b.booking_status.toUpperCase(), // Returns 'CONFIRMED' or 'PENDING' (booked hold)
      route: `${b.trips?.origin_name} ➔ ${b.trips?.destination_name}`,
      date_time: b.trips?.started_at || "TBD"
    }));
  }

  /**
   * Handles the "Quick Route Search" Form (From -> To)
   * Completely fixed to map against your authentic schema properties (origin_name, destination_name on trips table)
   */
  static async searchLiveTripsByTerminals(startTerminal: string, endTerminal: string) {
    if (!startTerminal || !endTerminal) {
      throw new Error("Both start and end terminals are required to run a quick search.");
    }

    // Leverages direct queries matching your trip indexing structures
    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        bus_id,
        origin_name,
        destination_name,
        price,
        ride_status,
        total_seats,
        occupied_seats,
        started_at,
        companies:company_id (
          name
        )
      `)
      .ilike("origin_name", `%${startTerminal.trim()}%`)
      .ilike("destination_name", `%${endTerminal.trim()}%`)
      .eq("ride_status", "scheduled") 
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Flatten the response payload structure to make it cleaner to consume on the front-end
    return (data || []).map((trip: any) => ({
      trip_id: trip.id,
      route: `${trip.origin_name} ➔ ${trip.destination_name}`,
      origin: trip.origin_name,
      destination: trip.destination_name,
      bus_identifier: trip.bus_id,
      status: trip.ride_status,
      price: trip.price,
      company_name: trip.companies?.name || "Independent Fleet",
      seats_available: (trip.total_seats || 30) - (trip.occupied_seats || 0),
      date_time: trip.started_at || "Scheduled"
    }));
  }
}