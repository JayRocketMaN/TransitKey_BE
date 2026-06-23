import { Request, Response } from "express";
import { NotificationService } from "../services/notification.services.js";

export class NotificationController {
  /**
   * Pulls structural notification updates linked to the authenticated ID
   */
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid session signature." });
      }

      const notifications = await NotificationService.getNotificationsByUser(userId);

      return res.status(200).json({
        success: true,
        count: notifications?.length || 0,
        notifications: notifications || []
      });
    } catch (error: any) {
      console.error("Notification pull crash:", error.message);
      return res.status(500).json({ error: error.message || "Failed to fetch notifications." });
    }
  }

  /**
   * Handles user trigger interactions to batch update reading states
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid session signature." });
      }

      await NotificationService.markUserNotificationsAsRead(userId);

      return res.status(200).json({
        success: true,
        message: "All alerts marked as read successfully."
      });
    } catch (error: any) {
      console.error("Notification update batch crash:", error.message);
      return res.status(500).json({ error: error.message || "Failed to update alert statuses." });
    }
  }
}
