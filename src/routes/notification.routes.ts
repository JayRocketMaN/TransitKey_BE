import { Router } from "express";
import { NotificationController } from "../controllers/notification.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/notifications -> Fetches alerts list for dashboard component
router.get("/", authorize(["passenger", "admin", "driver"]), NotificationController.getMyNotifications);

// POST /api/notifications/read-all -> Clears unread counts
router.post("/read-all", authorize(["passenger", "admin", "driver"]), NotificationController.markAllAsRead);

export default router;
