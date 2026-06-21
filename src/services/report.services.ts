import { supabase } from "../config/supabase.js";

export interface ReportInput {
  image_url?: string | null;
  category: string;
  message: string;
  report_type: string;
  location?: any;
  location_name?: string;
  vehicle_id: string;
  driver_id: string;
  park_id: string;
  company_name?: string;
  status: string;
}

export class ReportService {
  // 1. Fetches the latest trip and joins vehicles to safely extract the park configuration
  static async getLatestTrip(userId: string) {
    return await supabase
      .from("trips")
      .select(`
        id, 
        driver_id, 
        vehicle_id,
        vehicles!inner (
          park_id
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  // 2. Updated to fetch the necessary vehicle/park profile context details
  static async getDriver(driverId: string) {
    return await supabase
      .from("drivers") // Adjusted table from 'users' to 'drivers' to capture park metadata fields
      .select("park_id, company_name")
      .eq("id", driverId)
      .maybeSingle();
  }

  // 3. Implemented clean saving including the operator reporting filter properties
  static async createReport(userId: string, trip: any, details: ReportInput) {
    return await supabase
      .from("reports")
      .insert([
        {
          user_id: userId,
          driver_id: details.driver_id,
          vehicle_id: details.vehicle_id,
          park_id: details.park_id, // Safely mapped from the explicit context payload
          company_name: details.company_name || null,
          trip_id: trip.id,
          description: details.message,
          report_type: details.report_type,
          cartegory: details.category, // Matches database schema spelling configuration safely
          location: details.location || null,
          location_name: details.location_name || null,
          image_url: details.image_url || null,
          status: details.status
        },
      ]);
  }
}
