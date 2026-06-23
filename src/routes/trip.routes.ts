import { Router } from "express";
import { TripController } from "../controllers/trip.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Fetches summary list of pending/paid bookings for the logged-in user feeds directly into the "Upcoming Trips Summary" table
router.get("/summary", authorize(["passenger", "admin"]), TripController.getMySummary);

// Allows park administrators to schedule a new transit manifest
router.post("/schedule", authorize(["admin"]), TripController.createTrip);

// Initiates a trip and broadcasts GPS updates (Accessible by drivers on the road or admin operators via dashboard override)
router.post("/start", authorize(["admin", "driver"]), TripController.startTrip);

// Fetches active company trips for operator panels and drivers
router.get("/active", authorize(["admin", "driver"]), TripController.getMyTrips);

// Used to close out an arrived journey manifest safely or cancel a trip (Expanded permission to admin role for dashboard control)
router.post("/complete", authorize(["admin", "driver"]), TripController.completeTrip); 

export default router;
