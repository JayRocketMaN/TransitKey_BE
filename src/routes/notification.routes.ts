import { Router } from "express";
import { NotificationController } from "../controllers/notification.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

//Fetches alerts list for dashboard component
router.get("/", authorize(["passenger", "admin", "driver", "operator"]), NotificationController.getMyNotifications);


router.post("/read-all", authorize(["passenger", "admin", "driver", "operator"]), NotificationController.markAllAsRead);

export default router;
