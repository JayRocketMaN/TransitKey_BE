import { supabase } from "../config/supabase.js";

interface FleetFilters {
  companyId?: string;
  origin?: string;
  destination?: string;
}

export const getFleetOverview = async (filters: FleetFilters) => {
  // Base query construction aligned perfectly with your real table schemas
  let query = supabase
    .from("trips")
    .select(`
      id,
      bus_id,
      origin_name,
      destination_name,
      price,
      ride_status,
      occupied_seats,
      total_seats,
      started_at,
      driver_profiles!inner (
        id,
        full_name,
        phone_number
      )
    `)
    .eq("ride_status", "in-progress"); // Displays dynamic fleet operations on the active live map

  // Filter matching your exact database indexing strategies
  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId); 
  }

  if (filters.origin) {
    query = query.ilike("origin_name", `%${filters.origin.trim()}%`);
  }
  
  if (filters.destination) {
    query = query.ilike("destination_name", `%${filters.destination.trim()}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Fleet Query Execution Crash:", error.message);
    throw error;
  }
  
  return data;
};
