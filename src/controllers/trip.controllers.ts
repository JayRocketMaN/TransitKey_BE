import { Request, Response } from "express";
import { TripService, TripInput } from "../services/trip.services.js";
import { supabase } from "../config/supabase.js"; // 🧠 Injected to run the strict vehicles fleet check

export class TripController {
  /**
   * 1. Creates/Schedules a new journey transit manifest
   * STRICT REGISTRY CHECK: Validates vehicle existence, park ownership, and capacity limits.
   */
  static async createTrip(req: Request, res: Response) {
    try {
      const operatorId = req.user?.id;
      const userRole = req.user?.user_role || (req.user as any)?.role;
      const jwtCompanyId = req.user?.company_id || (req.user as any)?.company_id;

      // 🔍 DIAGNOSTIC LOG: Watch your running terminal when you hit Postman!
      console.log("🚀 [TripController.createTrip] Handshake -> Role:", userRole, " | User ID:", operatorId);

      if (userRole !== 'admin' || !operatorId) {
        return res.status(403).json({ message: "Only operators can create trips." });
      }

      if (!jwtCompanyId) {
        return res.status(403).json({ error: "Operator profile context is missing a verified company/park assignment reference." });
      }

      const inputBusId = req.body.bus_id || req.body.busId;
      if (!inputBusId) return res.status(400).json({ error: "bus_id (Vehicle UUID) is a required field." });

      // 🧠 STRICT FLEET SECURITY CHECK: Query your vehicles table
      // Validates: 1) Vehicle exists, 2) Linked to this operator's park, 3) Status is active
      const { data: verifiedVehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, capacity")
        .eq("id", inputBusId)
        .eq("park_id", jwtCompanyId) // Enforces rigid operator park cross-boundaries
        .eq("status", "active")
        .maybeSingle();

      if (vehicleError) {
        return res.status(500).json({ error: `Fleet verification database failure: ${vehicleError.message}` });
      }
      
      if (!verifiedVehicle) {
        return res.status(400).json({ 
          error: "Validation Failed: Selected bus_id does not exist in your park's fleet registry, belongs to another company, or is currently inactive." 
        });
      }

      // Safe payload extraction mapping inheriting seating limits natively from your vehicle record
      const tripData: TripInput = {
        driver_id: req.body.driver_id || req.body.driverId,
        company_id: jwtCompanyId, 
        bus_id: verifiedVehicle.id, // Passes down the strictly verified UUID string 
        origin_name: req.body.origin_name || req.body.originName,
        destination_name: req.body.destination_name || req.body.destinationName,
        price: req.body.price !== undefined ? parseFloat(req.body.price) : 0.00,
        total_seats: verifiedVehicle.capacity || 14, // 🧠 AUTOMATION: Inherits registered capacity seamlessly!
      };

      // Early explicit validation checks before querying database
      if (!tripData.driver_id) return res.status(400).json({ error: "driver_id is a required field." });
      if (!tripData.origin_name) return res.status(400).json({ error: "origin_name is a required field." });
      if (!tripData.destination_name) return res.status(400).json({ error: "destination_name is a required field." });
      
      // ALIGNED: Passes the validated company ID context directly to comply with your foreign key rules
      const result = await TripService.createTrip(jwtCompanyId, tripData);

      const data = (result as any).data || result;
      const error = (result as any).error;

      if (error) {
        // Intercept relationship constraint mismatch messages (e.g. Invalid Driver Profile UUID)
        if (error.code === "23505" || error.code === "23503") {
          return res.status(400).json({ error: "Database relation constraint violation. Please verify that your driver_id or company_id values are valid records." });
        }
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ message: "Trip scheduled successfully", trip: data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * 2. Transitions trip status to 'in-progress' when driver leaves terminal park
   */
  static async startTrip(req: Request, res: Response) {
    try {
      const tripId = req.body.trip_id || req.body.tripId;
      
      if (!tripId) {
        return res.status(400).json({ error: "trip_id is required in request body" });
      }

      // Changed status 'in transit' to database-supported constraint value 'in-progress'
      const result = await TripService.updateTripStatus(tripId, 'in-progress');
      
      const data = (result as any).data || result;
      const error = (result as any).error;

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ message: "Trip is now in progress", trip: data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * 3. Get active company fleet trip dashboard manifests
   */
  static async getMyTrips(req: Request, res: Response) {
    try {
      const operatorId = req.user?.id;
      const companyId = req.user?.company_id || (req.user as any)?.company_id;

      if (!operatorId) return res.status(401).json({ message: "Unauthorized" });
      if (!companyId) return res.status(403).json({ error: "Operator is not assigned to a company" });

      const result = await TripService.getActiveTripsByCompany(companyId);
      
      const data = (result as any).data || result;
      const error = (result as any).error;

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ count: data?.length || 0, trips: data || [] });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * 4. Completes a trip journey
   */
  static async completeTrip(req: Request, res: Response) {
    try {
      const tripId = req.body.tripId || req.body.trip_id;
      const status = req.body.status;

      if (!tripId || !status) {
        return res.status(400).json({ message: "tripId and status are required fields." });
      }

      const normalizedStatus = String(status).toLowerCase().trim();
      
      // Filter out statuses to perfectly align with your Postgres constraints check
      const databaseAllowedStatuses = ["completed", "cancelled"];

      if (!databaseAllowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ 
          message: `Status mismatch. Use 'completed' or 'cancelled' to align with DB rules.` 
        });
      }

      // Sync status updates across your service endpoints
      const result = await TripService.updateTripStatus(tripId, normalizedStatus as any);
      
      const data = (result as any).data || result;
      const error = (result as any).error;

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        message: "Trip status updated successfully",
        trip: data || { id: tripId, status: normalizedStatus },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }

  /**
   * 5. FIGMA UI FEATURE: Upcoming Trips Summary Dashboard Component
   * Fetches all pending holds and paid tickets assigned explicitly to the logged-in user
   */
  static async getMySummary(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User context missing" });
      }

      // Leverages the query metrics calculation inside your TripService layer
      const summaryList = await TripService.getPassengerUpcomingSummary(userId);

      return res.status(200).json({ 
        summary: summaryList 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }
}
