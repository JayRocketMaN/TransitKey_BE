import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";

export class NotificationController {
  /**
   * Fetches all notification alerts for the logged-in passenger
   */
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch notifications sorted by newest first
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        count: notifications?.length || 0,
        notifications: notifications || []
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Marks all notifications as read for the "VIEW ALL NOTIFICATIONS" button
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ message: "All notifications marked as read." });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
