import { supabase } from '../config/supabase.js';
import { LocationUpdateBody } from '../types/location.interface.js';

interface BatchPingInput {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export class LocationService {
  
  // ==========================================
  // PRIVATE GEOSPATIAL HELPER METHODS
  // ==========================================

  /**
   * Helper to build uniform PostGIS Extended Well-Known Text (EWKT) strings.
   * Crucial rule: PostGIS geography shapes accept Longitude first, then Latitude.
   */
  private static toEwktString(lat: number, lng: number): string {
    const cleanLat = parseFloat(lat as any);
    const cleanLng = parseFloat(lng as any);
    return `SRID=4326;POINT(${cleanLng} ${cleanLat})`;
  }

  /**
   * Universal internal parser to safely extract float coordinates from native PostGIS outputs.
   */
  private static parsePostGisLocation(geoData: any): { lat: number; lng: number } | null {
    if (!geoData) return null;

    let longitude: number | null = null;
    let latitude: number | null = null;

    if (typeof geoData === 'string') {
      const matches = geoData.match(/POINT\(([^)]+)\)/);
      if (matches && matches[1]) {
        const parts = matches[1].split(' ');
        longitude = parseFloat(parts[0]);
        latitude = parseFloat(parts[1]);
      }
    } else if (Array.isArray(geoData.coordinates)) {
      longitude = geoData.coordinates[0];
      latitude = geoData.coordinates[1];
    }

    if (longitude !== null && latitude !== null && !isNaN(longitude) && !isNaN(latitude)) {
      return { lat: latitude, lng: longitude };
    }

    return null;
  }

  // ==========================================
  // CORE WRITE / MUTATION OPERATIONS
  // ==========================================

  /**
   * Update Live GPS Pin (Upserting vehicle_locations table)
   */
  static async updateTripLocation(data: LocationUpdateBody): Promise<void> {
    const { tripId, lat, lng } = data;
    const ewktString = this.toEwktString(lat, lng);

    const { error } = await supabase
      .from('vehicle_locations')
      .upsert(
        { 
          trip_id: tripId, 
          location: ewktString, 
          updated_at: new Date().toISOString() 
        }, 
        { onConflict: 'trip_id' }
      );

    if (error) {
      console.error("❌ PostGIS Live GPS Ping Upsert Failure:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Batch Sync Offline Data — (Using robust native EWKT mapping strings)
   */
  static async syncBatchLocations(batchData: BatchPingInput[]): Promise<void> {
    if (!batchData || batchData.length === 0) return;

    const historyEntries = batchData.map(point => ({
      trip_id: point.tripId,
      location: this.toEwktString(point.lat, point.lng),
      recorded_at: point.timestamp
    }));

    const latestPoint = batchData[batchData.length - 1];
    const currentEntry = {
      trip_id: latestPoint.tripId,
      location: this.toEwktString(latestPoint.lat, latestPoint.lng),
      updated_at: latestPoint.timestamp
    };

    const { error: historyError } = await supabase.from('location_history').insert(historyEntries);
    const { error: liveError } = await supabase.from('vehicle_locations').upsert(currentEntry, { onConflict: 'trip_id' });

    if (historyError || liveError) {
      console.error("❌ PostGIS Batch Offline Sync Operation Failed:", historyError?.message || liveError?.message);
      throw new Error("Batch location sync failed.");
    }
  }

  // ==========================================
  // READ / SPATIAL LOOKUP QUERY METHODS
  // ==========================================

  /**
   * Spatial Searching RPC — Handled by PostGIS Stored Function
   */
  static async searchBusesNearby(lat: number, lng: number, radiusMeters: number = 5000): Promise<any> {
    const { data, error } = await supabase.rpc('search_available_buses', {
      user_lat: lat,
      user_lng: lng,
      dist_meters: radiusMeters
    });

    if (error) throw new Error(error.message);
    return data;
  }  
  
  /**
   * PRODUCTION LIVE LOCATION FETCH — (Reads directly from stored RPC function)
   */
  static async getLatestTripLocation(tripId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_trip_location_coords', { p_trip_id: tripId })
      .maybeSingle();

    if (error) {
      console.error("❌ Spatial Coordinates RPC Fetch Failure:", error.message);
      throw error;
    }
    
    if (!data) return null;
    const record = data as any;

    return {
      trip_id: record.trip_id,
      updated_at: record.updated_at,
      lat: record.lat !== null ? parseFloat(record.lat.toFixed(6)) : null,
      lng: record.lng !== null ? parseFloat(record.lng.toFixed(6)) : null
    };
  }

  /**
   * Fetch chronological trip trail coordinates to draw path Polylines on maps
   */
  static async getTripRouteHistory(tripId: string): Promise<[number, number][]> {
    const { data, error } = await supabase
      .from('location_history')
      .select('location, recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;

    return data?.map((entry: any) => {
      const parsed = this.parsePostGisLocation(entry.location);
      return parsed ? [parsed.lat, parsed.lng] as [number, number] : null;
    }).filter((coord): coord is [number, number] => coord !== null) || [];
  }

  /**
   * Fetch Manager Fleet View with PostGIS Array Conversion
   */
  static async getManagerFleetView(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        bus_id,
        origin_name,
        destination_name,
        price,
        ride_status,
        occupied_seats,
        total_seats,
        driver_profiles:driver_id (full_name),
        vehicle_locations (
          updated_at,
          location
        )
      `)
      .eq('company_id', companyId);

    if (error) throw error;

    return data?.map((trip: any) => {
      const parsedCoords = this.parsePostGisLocation(trip.vehicle_locations?.location);

      return {
        id: trip.id,
        bus_id: trip.bus_id,
        origin: trip.origin_name,
        destination: trip.destination_name,
        ride_status: trip.ride_status,
        price: trip.price,
        seats_summary: `${trip.occupied_seats || 0}/${trip.total_seats || 30}`,
        driver_name: trip.driver_profiles ? trip.driver_profiles.full_name : "Unassigned Driver",
        updated_at: trip.vehicle_locations?.updated_at || null,
        coordinates: parsedCoords ? { lat: parsedCoords.lat, lng: parsedCoords.lng } : null,
      };
    }) || [];
  }
}
