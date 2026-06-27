import { supabase } from "../config/supabase.js";

export interface ReportInput {
  image_url?: string | null;
  category: string;
  message: string;
  report_type: string;
  location?: any;
  location_name?: string;
  bus_id: string; 
  driver_id: string;
  park_id: string;
  company_name?: string;
  status: string;
}

export class ReportService {
  /**
   * 1. Fetches the latest trip and its related vehicle metadata separately
   * to bypass the text vs uuid foreign key constraint mismatch.
   */
   static async getLatestTrip(customUserId: string) {
    // 1. Fetch the trip row on its own—NO INNER JOINS ALLOWED HERE
    const tripResult = await supabase
      .from("trips")
      .select("id, driver_id, bus_id") // Simple flat query
      .eq("user_id", customUserId) 
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tripResult.error || !tripResult.data) {
      return tripResult; 
    }

    const tripData = tripResult.data;

    // 2. Fetch the vehicle row in a separate flat query using the plate number string
    const vehicleResult = await supabase
      .from("vehicles")
      .select("park_id")
      .eq("license_plate", tripData.bus_id) // Match against your text column name
      .maybeSingle();

    // 3. Reconstruct the payload layout manually so your controller doesn't break
    return {
      error: vehicleResult.error || null,
      data: vehicleResult.data ? {
        ...tripData,
        vehicles: {
          park_id: vehicleResult.data.park_id
        }
      } : null
    };
  }

  /**
   * 2. Fetches metadata from driver_profiles (matching your foreign key constraint)
   */
  static async getDriver(driverId: string) {
    return await supabase
      .from("driver_profiles") 
      .select("park_id, company_name")
      .eq("id", driverId)
      .maybeSingle();
  }

  /**
   * 3. Saves the compiled operational report safely to your database logs
   */
  static async createReport(customUserId: string, trip: any, details: ReportInput) {
    return await supabase
      .from("reports")
      .insert([
        {
          user_id: customUserId,
          driver_id: details.driver_id,
          bus_id: details.bus_id, 
          park_id: details.park_id, 
          company_name: details.company_name || null,
          trip_id: trip.id,
          description: details.message,
          report_type: details.report_type,
          cartegory: details.category, 
          location: details.location || null,
          location_name: details.location_name || null,
          image_url: details.image_url || null,
          status: details.status
        },
      ]);
  }
}
