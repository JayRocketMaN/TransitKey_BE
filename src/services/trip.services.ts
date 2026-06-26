import { supabase } from "../config/supabase.js";

export type TripStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface TripInput {
  driver_id: string;
  company_id: string;
  bus_id: string; 
  origin_name: string;
  destination_name: string;
  price: number;
  total_seats: number;
}

interface BookingRowPayload {
  id: string;
  seat_number: string;
  booking_status: string;
  created_at: string;
  trips: {
    id: string;
    origin_name: string;
    destination_name: string;
    price: number;
    ride_status: string;
    started_at: string | null;
  } | null;
}

export class TripService {
  
  // ==========================================
  // CORE TRANSIT MUTATIONS & HANDSHAKES
  // ==========================================

  /**
   * Handshake: Transition trip from 'scheduled' to 'in-progress' via RPC.
   * Directly triggers your database PostGIS starting trail initialization routines.
   */
  static async startTrip(tripId: string, startLat: number, startLng: number): Promise<{ data: any; error: null }> {
    const { data, error } = await supabase.rpc('start_trip_transaction', {
      p_trip_id: tripId,
      p_lat: parseFloat(startLat as any), // Enforces clean double-precision floating numbers
      p_lng: parseFloat(startLng as any)  
    });

    if (error) {
      console.error("❌ PostGIS start_trip_transaction RPC Crash:", error.message);
      throw new Error(`Handshake failed: ${error.message}`);
    }
    
    return { data, error: null };
  }

  /**
   * Creates/Schedules a new journey transit manifest.
   */
  static async createTrip(companyId: string, data: TripInput) {
    const { data: trip, error } = await supabase
      .from("trips")
      .insert([{
        driver_id: data.driver_id,
        company_id: companyId, 
        bus_id: data.bus_id, 
        origin_name: String(data.origin_name).trim(),
        destination_name: String(data.destination_name).trim(),
        price: parseFloat(data.price as any) || 0.00,
        total_seats: parseInt(data.total_seats as any) || 14,
        ride_status: "scheduled"
      }])
      .select()
      .maybeSingle(); 

    return { data: trip, error };
  }

  /**
   * Updates an ongoing trip status layout.
   * Dynamically records started_at values to drive live passenger ETAs.
   */
  static async updateTripStatus(tripId: string, status: TripStatus) {
    const updatePayload: Record<string, any> = { 
      ride_status: status,
      updated_at: new Date().toISOString()
    };

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

  // ==========================================
  // DASHBOARD LOOKUPS & VISITOR SUMMARIES
  // ==========================================

  /**
   * Get active company fleet trip dashboard manifests.
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
   * Fetches all confirmed or pending trip bookings assigned explicitly to the logged-in passenger.
   */
  static async getPassengerUpcomingSummary(userId: string) {
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
      .or("booking_status.eq.booked,booking_status.eq.confirmed") 
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Upcoming Passenger Summary Fetch Failure:", error.message);
      throw new Error(error.message);
    }
    
    const records = (data as unknown as BookingRowPayload[]) || [];

    return records.map((b) => ({
      booking_id: b.id,
      seat_number: b.seat_number,
      status: String(b.booking_status).toUpperCase(), // Standardizes holds vs paid slots
      route: b.trips ? `${b.trips.origin_name} ➔ ${b.trips.destination_name}` : "Unknown Route Manifest",
      date_time: b.trips?.started_at || "TBD"
    }));
  }

  /**
   * Handles the "Quick Route Search" Form (From -> To).
   * Pulls scheduled paths matching text parameters before departure flags execute.
   */
  static async searchLiveTripsByTerminals(startTerminal: string, endTerminal: string) {
    const cleanStart = String(startTerminal || '').trim();
    const cleanEnd = String(endTerminal || '').trim();

    if (!cleanStart || !cleanEnd) {
      throw new Error("Both start and end terminals are required to run a quick search.");
    }

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
      .ilike("origin_name", `%${cleanStart}%`)
      .ilike("destination_name", `%${cleanEnd}%`)
      .eq("ride_status", "scheduled") 
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Search Live Trips Transaction Error:", error.message);
      throw new Error(error.message);
    }

    const records = data || [];

    return records.map((trip: any) => ({
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
