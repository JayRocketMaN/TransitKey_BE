import { Router } from "express";
import authRoutes from "./auth.routes.js";
import locationRoutes from "./location.routes.js";
import parkRoutes from "./park.routes.js";
import driverRoutes from "./driver.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import fleetRoutes from "./fleet.routes.js";
import bookingRoutes from "./booking.routes.js";
import reportRoutes from "./report.routes.js";
import assignmentRoutes from "./assign.routes.js";
import codeRoutes from "./code.routes.js";
import trackRoutes from "./track.routes.js";
import tripRoutes from "./trip.routes.js";
import notificationRoutes from "./notification.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

// Feature-based mounting
router.use("/auth", authRoutes);           // /api/auth
router.use("/location", locationRoutes);   // /api/location
router.use("/park", parkRoutes);         // /api/parks
router.use("/driver", driverRoutes);     // /api/drivers
router.use("/inventory", inventoryRoutes); // /api/inventory
router.use("/fleet", fleetRoutes);         // /api/fleet (Marketplace)
router.use("/booking", bookingRoutes);   // /api/bookings
router.use("/report", reportRoutes);     // /api/reports
router.use("/assignment", assignmentRoutes); // /api/assignments
router.use("/code", codeRoutes); // /api/generate-code
router.use("/track", trackRoutes); // /api/track
router.use("/trip", tripRoutes); // /api/trip
router.use("/notification", notificationRoutes); // /api/notifications
router.use("/dashboard", dashboardRoutes);

export default router;
