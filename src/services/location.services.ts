import { supabase } from '../config/supabase.js';
import { LocationUpdateBody } from '../types/location.interface.js';


export const updateTripLocation = async (data: LocationUpdateBody) => {
  const { tripId, lat, lng } = data; // Destructure inside the function
  
  const point = `POINT(${lng} ${lat})`;

  const { error } = await supabase
    .from('vehicle_locations')
    .upsert({ 
      trip_id: tripId, 
      location: point, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'trip_id' });

  if (error) throw new Error(error.message);
};


export const getLatestTripLocation = async (tripId: string) => {
  const { data, error } = await supabase
    .from('vehicle_locations')
    .select('location, updated_at')
    .eq('trip_id', tripId)
    .single();

  if (error) throw error;
  
  // PostGIS location comes back as a WKB/GeoJSON string. 
  // You might want to parse it here if your frontend needs plain lat/lng.
  return data;
};



export const getTripDetailsWithLocation = async (tripId: string) => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      bus_id,
      origin_name,
      destination_name,
      occupied_seats,
      vehicle_locations (
        location,
        updated_at
      )
    `)
    .eq('id', tripId)
    .single();

  if (error) throw error;
  return data;
};


export const searchBusesNearby = async (lat: number, lng: number, radiusMeters: number = 5000) => {
  const { data, error } = await supabase.rpc('search_available_buses', {
    user_lat: lat,
    user_lng: lng,
    dist_meters: radiusMeters
  });

  if (error) throw new Error(error.message);
  
  // The 'location' returned here is the GeoJSON [lng, lat] format
  return data;
};



/**
 * Saves a bundle of coordinates from a driver's offline buffer.
 */
export const syncBatchLocations = async (batchData: { tripId: string; lat: number; lng: number; timestamp: string }[]) => {
  
  // Format the data for our 'location_history' table
  const historyEntries = batchData.map(point => ({
    trip_id: point.tripId,
    location: `POINT(${point.lng} ${point.lat})`,
    recorded_at: point.timestamp // Use the time the GPS actually captured it
  }));

  // Format the LATEST point for our 'vehicle_locations' table (the "current" marker)
  const latestPoint = batchData[batchData.length - 1];
  const currentEntry = {
    trip_id: latestPoint.tripId,
    location: `POINT(${latestPoint.lng} ${latestPoint.lat})`,
    updated_at: latestPoint.timestamp
  };

  // Run both updates
  const { error: historyError } = await supabase.from('location_history').insert(historyEntries);
  const { error: liveError } = await supabase.from('vehicle_locations').upsert(currentEntry, { onConflict: 'trip_id' });

  if (historyError || liveError) {
    throw new Error("Batch sync failed partially.");
  }
};

export const getManagerFleetView = async (companyId: string) => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      bus_id,
      ride_status,
      price,
      occupied_seats,
      total_seats,
      my_users:driver_id (full_name), // Show the driver's name
      vehicle_locations (location, updated_at)
    `)
    .eq('company_id', companyId); // Managers only see THEIR company's buses

  if (error) throw error;
  return data;
};







