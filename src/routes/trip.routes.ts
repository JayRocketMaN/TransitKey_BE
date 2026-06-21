import { Router } from "express";
import { TripController } from "../controllers/trip.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

//Fetches summary list of pending/paid bookings for the logged-in user feeds directly into the "Upcoming Trips Summary" table
router.get("/summary", authorize(["passenger", "admin"]), TripController.getMySummary);

// Allows park administrators to schedule a new transit manifest
router.post("/schedule", authorize(["admin"]), TripController.createTrip);

//Only for drivers to initiate a trip and broadcast GPS updates to passengers and operators
router.post("/start", authorize(["driver"]), TripController.startTrip);

//Fetches active company trips for operator panels and drivers
router.get("/active", authorize(["admin", "driver"]), TripController.getMyTrips);

//Used by drivers to close out an arrived journey manifest safely
router.post("/complete", authorize(["driver"]), TripController.completeTrip); 

export default router;
