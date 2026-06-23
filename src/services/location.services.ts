import { supabase } from '../config/supabase.js';
import { LocationUpdateBody } from '../types/location.interface.js';

export class LocationService {
  /**
   * Update Live GPS Pin 
   */
  static async updateTripLocation(data: LocationUpdateBody) {
    const { tripId, lat, lng } = data;

    // PostGIS standard projection text mapping string (SRID 4326: Longitude Space Latitude)
    const ewktString = `SRID=4326;POINT(${parseFloat(lng as any)} ${parseFloat(lat as any)})`;

    const { error } = await supabase
      .from('vehicle_locations')
      .upsert({ 
        trip_id: tripId, 
        location: ewktString, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'trip_id' });

    if (error) {
      console.error(" PostGIS Live GPS Ping Upsert Failure:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Batch Sync Offline Data — (using robust native EWKT mapping strings)
   */
  static async syncBatchLocations(batchData: { tripId: string; lat: number; lng: number; timestamp: string }[]) {
    const historyEntries = batchData.map(point => ({
      trip_id: point.tripId,
      location: `SRID=4326;POINT(${parseFloat(point.lng as any)} ${parseFloat(point.lat as any)})`,
      recorded_at: point.timestamp
    }));

    const latestPoint = batchData[batchData.length - 1];
    const currentEntry = {
      trip_id: latestPoint.tripId,
      location: `SRID=4326;POINT(${parseFloat(latestPoint.lng as any)} ${parseFloat(latestPoint.lat as any)})`,
      updated_at: latestPoint.timestamp
    };

    const { error: historyError } = await supabase.from('location_history').insert(historyEntries);
    const { error: liveError } = await supabase.from('vehicle_locations').upsert(currentEntry, { onConflict: 'trip_id' });

    if (historyError || liveError) {
      console.error(" PostGIS Batch Offline Sync Operation Failed:", historyError?.message || liveError?.message);
      throw new Error("Batch location sync failed.");
    }
  }

  /**
   * Spatial Searching RPC — Handled by PostGIS Stored Function
   */
  static async searchBusesNearby(lat: number, lng: number, radiusMeters: number = 5000) {
    const { data, error } = await supabase.rpc('search_available_buses', {
      user_lat: lat,
      user_lng: lng,
      dist_meters: radiusMeters
    });

    if (error) throw new Error(error.message);
    return data;
  }  
  
  /**
   * PRODUCTION LIVE LOCATION FETCH
   */
  static async getLatestTripLocation(tripId: string) {
    // Let Supabase fetch the row natively without restrictive internal generic checks
    const { data, error } = await supabase
      .rpc('get_trip_location_coords', { p_trip_id: tripId })
      .maybeSingle();

    if (error) {
      console.error(" Spatial Coordinates RPC Fetch Failure:", error.message);
      throw error;
    }
    
    if (!data) return null;

    // Typecast data cleanly as an explicit tracking row mapping payload
    const record = data as any;

    return {
      trip_id: record.trip_id,
      updated_at: record.updated_at,
      lat: record.lat !== null ? parseFloat(record.lat.toFixed(6)) : null,
      lng: record.lng !== null ? parseFloat(record.lng.toFixed(6)) : null
    };
  }

  /**
   * Fetch Manager Fleet View with PostGIS Conversion
   * Fixed to prevent undefined array coordinate crashes from the DB layer
   */
  static async getManagerFleetView(companyId: string) {
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

    // Standardize mapping parameters into clean float coordinates safely
    return data?.map((trip: any) => {
      const geoData = trip.vehicle_locations?.location as any;
      
      let longitude = null;
      let latitude = null;

      // Safe evaluation parser fallback string extraction handles hex/WKT shapes safely
      if (geoData && typeof geoData === 'string') {
        const matches = geoData.match(/POINT\(([^)]+)\)/);
        if (matches && matches[1]) {
          const parts = matches[1].split(' ');
          longitude = parseFloat(parts[0]);
          latitude = parseFloat(parts[1]);
        }
      } else if (geoData && Array.isArray(geoData.coordinates)) {
        longitude = geoData.coordinates[0];
        latitude = geoData.coordinates[1];
      }

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
        coordinates: longitude !== null && latitude !== null ? {
          lat: latitude, 
          lng: longitude  
        } : null
      };
    }) || [];
  }
}
