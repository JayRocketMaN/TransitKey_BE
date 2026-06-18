import { Router } from "express";
import { BookingController } from "../controllers/booking.controllers.js";
import { authorize } from "../middleware/auth.middleware.js"; // Adjust based on your auth middleware path

const router = Router();

// GET /api/bookings/:tripId/seats -> Fetch available seat numbers
router.get("/:tripId/seats", BookingController.getSeatLayout);

// POST /api/bookings/book -> Book a selected seat number
router.post("/book", authorize(["passenger", "admin"]), BookingController.bookSeat);

router.post("/create-ticket", authorize(["admin"]), BookingController.verifyPayment);

// POST /api/bookings/cancel -> Cancel an un-departed booking
router.post("/cancel", authorize(["passenger", "admin"]), BookingController.cancelBooking);

export default router;
