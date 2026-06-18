import { supabase } from "../config/supabase.js";

interface FleetFilters {
  companyName?: string;
  origin?: string;
  destination?: string;
}

export const getGlobalFleetOverview = async (filters: FleetFilters) => {
  let query = supabase
    .from("vehicles")
    .select(`
      *,
      parks (
        park_name,
        state_located,
        park_location
      ),
      routes (
        destination,
        standard_fare
      )
    `)
    .eq("status", "active"); // Only show buses ready to work

  if (filters.origin) {
    query = query.eq("parks.state_located", filters.origin);
  }
  
  if (filters.destination) {
    query = query.eq("routes.destination", filters.destination);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
