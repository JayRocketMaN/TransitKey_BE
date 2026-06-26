import { supabase } from '../config/supabase.js';

interface NearbyBusRpcResult {
  trip_id: string;
  bus_id: string;
  origin_name: string;
  destination_name: string;
  ride_status: string;
  current_lat: number;
  current_lng: number;
  distance_meters: number;
}

interface StandardizedBusOutput {
  trip_id: string;
  bus_id: string;
  origin: string;
  destination: string;
  status: string;
  distance_km: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export class PassengerService {

  // ==========================================
  // SPATIAL GEOLOCATION QUERIES
  // ==========================================

  /**
   * Parse and wrap available nearby vehicles with localized distance summaries.
   * Leverages the specialized GiST-indexed PostGIS radius lookup function.
   */
  static async locateAvailableFleetNearby(
    lat: number, 
    lng: number, 
    radiusMeters: number = 5000
  ): Promise<StandardizedBusOutput[]> {
    
    const { data, error } = await supabase.rpc('search_available_buses', {
      user_lat: parseFloat(lat as any),
      user_lng: parseFloat(lng as any),
      dist_meters: parseFloat(radiusMeters as any)
    });

    if (error) {
      console.error("❌ PostGIS Nearby Bus RPC Lookup Failure:", error.message);
      throw new Error(error.message);
    }

    const records = (data as NearbyBusRpcResult[]) || [];

    return records.map((bus) => ({
      trip_id: bus.trip_id,
      bus_id: bus.bus_id,
      origin: bus.origin_name,
      destination: bus.destination_name,
      status: bus.ride_status,
      distance_km: parseFloat((bus.distance_meters / 1000).toFixed(2)),
      coordinates: {
        lat: bus.current_lat,
        lng: bus.current_lng
      }
    }));
  }

  // ==========================================
  // TEXT ROUTE SEARCH QUERIES
  // ==========================================

  /**
   * Fetch active trip configurations matching text-based passenger search inputs.
   */
  static async searchTripsByRoute(origin: string, destination: string): Promise<any[]> {
    const cleanOrigin = String(origin || '').trim();
    const cleanDestination = String(destination || '').trim();

    if (!cleanOrigin || !cleanDestination) {
      return [];
    }

    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        bus_id,
        origin_name,
        destination_name,
        ride_status,
        price,
        total_seats,
        occupied_seats
      `)
      .ilike('origin_name', `%${cleanOrigin}%`)
      .ilike('destination_name', `%${cleanDestination}%`)
      .eq('ride_status', 'in-progress');

    if (error) {
      console.error("❌ Supabase Trip Route Search Failure:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  }
}
