import { supabase } from "../config/supabase.js";

// Updated to completely reflect your 7 new structural database fields
export interface RouteInput {
  route_name: string;          // 1. Route Name
  start_terminal: string;      // 2. Start Terminal
  end_terminal: string;        // 3. End Terminal
  distance_km?: number | null; // 4. Distance in km
  duration_minutes?: number | null; // 5. Duration in minutes
  fare: number;                // 6. Fare Price
  stops?: string[];            // 7. Stops (Stored as text array string[])
}

export class RouteService {
  /**
   * FIXED: Points to 'companies' table and 'owner_id' column
   */
  static async getParkByOperator(operatorId: string) {
    return await supabase
      .from("companies") 
      .select("*") 
      .eq("owner_id", operatorId)
      .maybeSingle();
  }

  /**
   * Creates a route linked to the company (park_id) mapping all 7 columns
   */
  static async createRoute(parkId: string, data: RouteInput) {
    return await supabase
      .from("routes")
      .insert([
        {
          park_id: parkId,
          route_name: data.route_name.trim(),
          start_terminal: data.start_terminal.trim(),
          end_terminal: data.end_terminal.trim(),
          distance_km: data.distance_km ?? null,
          duration_minutes: data.duration_minutes ?? null,
          fare: data.fare,
          stops: data.stops ?? [] // Directly accepts array string data structure
        },
      ])
      .select()
      .single();
  }

  /**
   * Fetches park routes sorted alphabetically by the new route_name index
   */
  static async getRoutesByPark(parkId: string) {
    return await supabase
      .from("routes")
      .select("*")
      .eq("park_id", parkId)
      .order("route_name", { ascending: true }); // Optimized to use your new index
  }

  /**
   * Safely updates an existing route profile record
   */
  static async updateRoute(routeId: string, parkId: string, updateData: any) {
    return await supabase
      .from("routes")
      .update(updateData)
      .eq("id", routeId)
      .eq("park_id", parkId)
      .select()
      .maybeSingle();
  }

  /**
   * Public: Fetches all routes cross-joining the company profile contexts
   */
  static async fetchAllRoutesWithParks() {
    return await supabase
      .from("routes")
      .select(`
        id,
        route_name,
        start_terminal,
        end_terminal,
        distance_km,
        duration_minutes,
        fare,
        stops,
        created_at,
        companies (
          name,
          address
        )
      `)
      .order("route_name", { ascending: true });
  }
}


