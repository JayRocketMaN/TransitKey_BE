import { Request, Response } from "express";
import { BookingService } from "../services/booking.services.js";

export class BookingController {
  /**
   * Retrieves the layout of available and occupied seats for a specific trip
   */
  static async getSeatLayout(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: "tripId parameter is required" });

      const seatMap = await BookingService.getAvailableSeats(tripId as string);
      return res.status(200).json(seatMap);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Processes a specific seat reservation request and initializes a 30-minute hold window
   */
  static async bookSeat(req: Request, res: Response) {
    try {
      const { trip_id, seat_number } = req.body;
      const userId = req.user?.id;
      const exactSeatChosen = parseInt(seat_number, 10);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      if (!trip_id || isNaN(exactSeatChosen) || exactSeatChosen < 1) {
        return res.status(400).json({ message: "Invalid trip configuration or missing seat choice." });
      }

      const seatMap = await BookingService.getAvailableSeats(trip_id);

      if (!seatMap.available_seats.includes(exactSeatChosen)) {
        return res.status(400).json({ message: `Seat #${exactSeatChosen} is already held or out of range.` });
      }

      const { data: booking, error: bookingErr } = await BookingService.createBooking(userId, trip_id, exactSeatChosen);
      if (bookingErr) return res.status(500).json({ error: bookingErr.message });

      const updatedOccupancy = seatMap.seats_booked_count + 1;
      await BookingService.updateTripSeats(trip_id, updatedOccupancy);

      return res.status(201).json({
        message: `Seat #${exactSeatChosen} placed on temporary hold for 30 minutes! Please hurry to complete your payment and get your ticket.`,
        booking,
        seats_left: seatMap.total_seats - updatedOccupancy
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Admin / Operator Endpoint: Triggered when passenger pays cash/transfer offline
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { booking_id } = req.body;
      const userRole = req.user?.user_role || (req.user as any)?.role;

      // Restrict payment verification to admins/operators only
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Access Denied. Only operators can verify offline payments." });
      }

      if (!booking_id) return res.status(400).json({ error: "booking_id is required" });

      const { data, error } = await BookingService.confirmOfflinePayment(booking_id);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        message: "Offline payment confirmed successfully. Seat hold is now a permanent ticket.",
        booking: data
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cancels an active booking or manually releases a seat hold
   */
  static async cancelBooking(req: Request, res: Response) {
    try {
      const { booking_id } = req.body;
      const userId = req.user?.id;

      if (!userId || !booking_id) return res.status(400).json({ message: "Missing required booking identifiers." });

      const { data: booking, error } = await BookingService.getBookingWithTrip(booking_id, userId);
      
      if (error || !booking || booking.booking_status === "expired") {
        return res.status(404).json({ message: "Active booking record not found, or hold has already expired." });
      }

      const trip = (booking as any).trips;
      
      if (trip.ride_status === "in-progress" || trip.ride_status === "completed") {
        return res.status(400).json({ message: "Cancellation denied. Vehicle is already en route." });
      }

      await BookingService.deleteBooking(booking_id);
      
      const restoredOccupancy = Math.max(0, (trip.occupied_seats || 0) - 1);
      await BookingService.updateTripSeats(trip.id, restoredOccupancy);

      return res.status(200).json({ message: "Booking canceled successfully. Selected seat restored to available layout." });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
