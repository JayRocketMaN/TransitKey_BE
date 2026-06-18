import { supabase } from "../config/supabase.js";

export class BookingService {
  /**
   * AUTOMATED ALERTS ENGINE
   * Inserts notification cards directly into the database for the frontend to pull
   */
  static async triggerNotification(userId: string, type: "created" | "expired" | "confirmed", details: any) {
    try {
      let title = "";
      let message = "";

      if (type === "created") {
        title = "Seat Hold Active";
        message = `Your 30-minute hold on Seat #${details.seat} is active. Please complete your offline payment before it lapses.`;
      } else if (type === "confirmed") {
        title = "Payment Successful"; // 🧠 Matches your Figma UI card text exactly!
        message = `Payment verified offline. Seat #${details.seat} is permanently confirmed for your trip.`;
      } else {
        title = "Seat Hold Expired";
        message = `Your 30-minute temporary hold window lapsed for Seat #${details.seat}. The seat has been returned to the public pool.`;
      }

      // 🧠 Save the notification row so the passenger's dashboard can pull it via Method A
      await supabase.from("notifications").insert([
        {
          user_id: userId,
          title,
          message,
          is_read: false
        }
      ]);

      console.log(`📡 [SYSTEM LOG: NOTIFICATION RECORDED] Type: ${type.toUpperCase()} | User: ${userId}`);
    } catch (err: any) {
      console.error("💥 Failed to write system notification card:", err.message);
    }
  }

  /**
   * Scans and auto-cancels timed-out holds that haven't been confirmed offline
   */
  static async releaseExpiredHolds(tripId: string) {
    const currentTime = new Date().toISOString();

    // Only target unpaid temporary holds ('booked')
    const { data: expiredBookings } = await supabase
      .from("bookings")
      .select("id, user_id, seat_number")
      .eq("trip_id", tripId)
      .eq("booking_status", "booked")
      .lt("expires_at", currentTime);

    if (expiredBookings && expiredBookings.length > 0) {
      for (const booking of expiredBookings) {
        // 1. Transition status flag
        await supabase
          .from("bookings")
          .update({ booking_status: "expired" })
          .eq("id", booking.id);

        // 2. Automatically dispatch automated expiration log
        await this.triggerNotification(booking.user_id, "expired", {
          seat: booking.seat_number,
          tripId
        });
      }

      // 3. Decrement occupied metrics counter
      const { data: trip } = await supabase
        .from("trips")
        .select("occupied_seats")
        .eq("id", tripId)
        .single();

      const currentOccupied = trip?.occupied_seats || 0;
      const newOccupancy = Math.max(0, currentOccupied - expiredBookings.length);

      await this.updateTripSeats(tripId, newOccupancy);
    }
  }

  /**
   * Looks up a scheduled trip directly using its UUID identifier
   */
  static async findAvailableTrip(tripId: string) {
    return await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("ride_status", "scheduled")
      .maybeSingle();
  }

  /**
   * Maps a passenger's request data, attaches a 30-minute hold window, and sends an alert
   */
  static async createBooking(userId: string, tripId: string, seatNumber: number) {
    const holdDurationMinutes = 30;
    const expirationTimestamp = new Date(Date.now() + holdDurationMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("bookings")
      .insert([{
        trip_id: tripId,
        user_id: userId,
        seat_number: seatNumber,
        booking_status: "booked", 
        expires_at: expirationTimestamp
      }])
      .select()
      .single();

    if (!error && data) {
      // Trigger temporary hold notification insert
      await this.triggerNotification(userId, "created", {
        seat: seatNumber,
        expiresAt: expirationTimestamp
      });
    }

    return { data, error };
  }

  /**
   * Admin / Operator Action: Confirms offline payment received at park/terminal
   */
  static async confirmOfflinePayment(bookingId: string) {
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, trips:trip_id(ride_status)")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) throw new Error("Booking record not found.");
    if (booking.booking_status === "expired") throw new Error("Cannot confirm payment. This 30-minute hold has already expired.");

    // Update status to 'confirmed' and wipe expiration clock
    const { data, error } = await supabase
      .from("bookings")
      .update({ 
        booking_status: "confirmed",
        expires_at: null 
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (!error && data) {
      // Trigger confirmation insert
      await this.triggerNotification(data.user_id, "confirmed", { seat: data.seat_number });
    }

    return { data, error };
  }

  /**
   * Updates the occupancy counter fields on a trip row
   */
  static async updateTripSeats(tripId: string, newOccupiedCount: number) {
    return await supabase
      .from("trips")
      .update({ occupied_seats: newOccupiedCount })
      .eq("id", tripId);
  }

  /**
   * Fetches an active booking entry along with parent trip metrics
   */
  static async getBookingWithTrip(bookingId: string, userId: string) {
    return await supabase
      .from("bookings")
      .select("*, trips:trip_id(id, ride_status, total_seats, occupied_seats)")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .single();
  }

  /**
   * Deletes or voids a seat booking row completely
   */
  static async deleteBooking(bookingId: string) {
    return await supabase.from("bookings").delete().eq("id", bookingId);
  }

  /**
   * Sweeps expired holds first, then produces a fresh layout mapping
   */
  static async getAvailableSeats(tripId: string) {
    await this.releaseExpiredHolds(tripId);

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("total_seats, ride_status")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) throw new Error("Targeted trip details could not be found.");

    const { data: bookedSeatsData, error: bookingError } = await supabase
      .from("bookings")
      .select("seat_number")
      .eq("trip_id", tripId)
      .or("booking_status.eq.booked,booking_status.eq.confirmed");

    if (bookingError) throw new Error(`Failed to map configurations: ${bookingError.message}`);

    const occupiedSeats = bookedSeatsData ? bookedSeatsData.map((b: any) => Number(b.seat_number)) : [];
    const maxCapacity = trip.total_seats || 14; 
    const allSeats = Array.from({ length: maxCapacity }, (_, i) => i + 1);
    const availableSeats = allSeats.filter(seat => !occupiedSeats.includes(seat));

    return {
      trip_id: tripId,
      ride_status: trip.ride_status,
      total_seats: maxCapacity,
      seats_booked_count: occupiedSeats.length,
      seats_available_count: availableSeats.length,
      available_seats: availableSeats
    };
  }
}
