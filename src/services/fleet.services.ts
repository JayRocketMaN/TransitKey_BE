import { supabase } from '../config/supabase.js';

export const getGlobalFleetOverview = async (filters: { 
  companyName?: string; 
  origin?: string; 
  destination?: string; 
}) => {
  let query = supabase
    .from('companies')
    .select(`
      id,
      name,
      trips (
        id,
        bus_id,
        origin_name,
        destination_name,
        price,           
        occupied_seats,
        ride_status,
        vehicle_locations (
          location,
          updated_at
        )
      )
    `)
    .eq('trips.ride_status', 'in-progress');

  if (filters.companyName) {
    query = query.ilike('name', `%${filters.companyName}%`);
  }
  if (filters.origin) {
    query = query.ilike('trips.origin_name', `%${filters.origin}%`);
  }
  if (filters.destination) {
    query = query.ilike('trips.destination_name', `%${filters.destination}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
