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
      companies!inner (
        id,
        company_name,
        state_located
      ),
      routes!inner (
        id,
        route_name,
        start_terminal,
        end_terminal,
        fare
      )
    `)
    .eq("status", "active"); // Only show buses ready to work

  // 1. Filter by company name if provided
  if (filters.companyName) {
    query = query.eq("companies.company_name", filters.companyName); 
  }

  // 2. Filter by origin location (e.g. matching the starting terminal or state)
  if (filters.origin) {
    query = query.ilike("routes.start_terminal", `%${filters.origin}%`);
  }
  
  // 3. Filter by destination (matching the route's end terminal)
  if (filters.destination) {
    query = query.ilike("routes.end_terminal", `%${filters.destination}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
