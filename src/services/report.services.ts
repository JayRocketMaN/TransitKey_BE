import { supabase } from "../config/supabase.js";

export interface ReportInput {
  image_url?: string;
  category: string;
  message: string;
  report_type: string;
  location?: any;
  location_name?: string;
}

export class ReportService {
  static async getLatestTrip(userId: string) {
    return await supabase
      .from("trips")
      .select("id, driver_id, park_id, vehicle_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  static async getDriver(driverId: string) {
    return await supabase
      .from("users")
      .select("client_name")
      .eq("id", driverId)
      .maybeSingle();
  }

  static async createReport(userId: string, trip: any, details: ReportInput) {
    return await supabase
      .from("reports")
      .insert([
        {
          user_id: userId,
          driver_id: trip.driver_id,
          vehicle_id: trip.vehicle_id,
          park_id: trip.park_id,
          trip_id: trip.id,
          description: details.message,
          report_type: details.report_type,
          cartegory: details.category,
          location: details.location || null,
          location_name: details.location_name || null,
          image_url: details.image_url || null,
        },
      ]);
  }
}
