import { Router } from "express";
import { TripController } from "../controllers/trip.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 🔒 PROTECTED DASHBOARD FEED: Fetches summary list of pending/paid bookings for the logged-in user
// This feeds directly into the "Upcoming Trips Summary" table grid on the frontend
router.get("/summary", authorize(["passenger", "admin"]), TripController.getMySummary);

// 🔒 PROTECTED OPERATOR ROUTE: Allows park administrators to schedule a new transit manifest
router.post("/schedule", authorize(["admin"]), TripController.createTrip);

// 🔒 PROTECTED DRIVER ROUTE: Used by drivers to initiate a trip and broadcast GPS handshake telemetry
router.post("/start", authorize(["driver"]), TripController.startTrip);

// 🔒 PROTECTED FLEET VIEW: Fetches active company trips for operator panels and drivers
router.get("/active", authorize(["admin", "driver"]), TripController.getMyTrips);

// 🔒 PROTECTED DRIVER ROUTE: Used by drivers to close out an arrived journey manifest safely
router.post("/complete", authorize(["driver"]), TripController.completeTrip); 

export default router;
