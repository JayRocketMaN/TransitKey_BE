import { supabase } from "../config/supabase.js";

export class NotificationService {
  /**
   * Fetches all alerts linked directly to the logged-in account ID
   */
  static async getNotificationsByUser(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Updates all pending records for a single user to read status
   */
  static async markUserNotificationsAsRead(userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}
