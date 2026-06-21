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
      parks!inner (
        park_name,
        state_located,
        park_location
      ),
      routes!inner (
        destination,
        standard_fare
      )
    `)
    .eq("status", "active"); // Only show buses ready to work

  //Filter by company name if provided
  if (filters.companyName) {
    query = query.eq("company_name", filters.companyName); 
  }

  //Filter by origin state
  if (filters.origin) {
    query = query.eq("parks.state_located", filters.origin);
  }
  
  //Filter by destination
  if (filters.destination) {
    query = query.eq("routes.destination", filters.destination);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
