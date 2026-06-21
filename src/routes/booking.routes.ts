import { Router } from "express";
import { BookingController } from "../controllers/booking.controllers.js";
import { authorize } from "../middleware/auth.middleware.js"; 

const router = Router();

//Fetch available seat numbers
router.get("/:tripId/seats", BookingController.getSeatLayout);

//Book a selected seat number
router.post("/book", authorize(["passenger", "admin"]), BookingController.bookSeat);

//confirm a booking
router.post("/create-ticket", authorize(["admin"]), BookingController.verifyPayment);

//Cancel a booking
router.post("/cancel", authorize(["passenger", "admin"]), BookingController.cancelBooking);

export default router;
