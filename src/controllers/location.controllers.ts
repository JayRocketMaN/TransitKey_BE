import { Request, Response } from 'express';
import { LocationService } from '../services/location.services.js';
import { TripService } from '../services/trip.services.js';
import { LocationUpdateBody } from '../types/location.interface.js';
import { supabase } from '../config/supabase.js';

/**
 * START TRIP (The Handshake Handlers Matrix)
 * Smart fallback: Pulls from your auto-populated companies.park_location 
 * if the driver's hardware device skips passing explicit lat/lng parameters on startup.
 */
export const handleStartTrip = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.body;
    let { lat, lng } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required to start trip.' });
    }

    // 1. DYNAMIC FALLBACK: If driver device coordinates are missing, fetch the saved corporate park terminal location
    if (lat == null || lng == null) {
      console.log(`ℹ️ Driver device omitted coordinates. Querying saved corporate park location for trip: ${tripId}`);
      
      const { data: tripContext, error: dbError } = await supabase
        .from('trips')
        .select(`
          id,
          companies:company_id (
            park_location
          )
        `)
        .eq('id', tripId)
        .maybeSingle();

      if (dbError) throw dbError;

      // Grabs the data safely whether TypeScript infers it as an array or a single object
     const companiesData = tripContext?.companies;
     const parkGeo = Array.isArray(companiesData) 
     ? companiesData[0]?.park_location 
     : (companiesData as any)?.park_location;

      // Extract raw numbers out of the PostGIS geometry string if it exists
      if (parkGeo && typeof parkGeo === 'string') {
        const matches = parkGeo.match(/POINT\(([^)]+)\)/);
        if (matches && matches[1]) {
          const parts = matches[1].split(' ');
          lng = parseFloat(parts[0]);
          lat = parseFloat(parts[1]);
          console.log(`🎯 Pre-saved terminal found. Auto-populating parameters: Lat ${lat}, Lng ${lng}`);
        }
      }
    }

    // 2. ABSOLUTE CRASH SAFEGUARD: If both options resolve to null, throw an explicit validation error
    if (lat == null || lng == null) {
      return res.status(400).json({ 
        error: 'Trip cannot start. Please ensure your company terminal address is configured on the dashboard, or pass live driver device coordinates (lat/lng).' 
      });
    }

    // 3. Execute the PostGIS RPC transactions and advance operational states natively
    await TripService.startTrip(tripId, lat, lng);
    await TripService.updateTripStatus(tripId, 'in-progress');

    return res.status(200).json({ 
      status: 'success', 
      message: 'Trip started successfully. Dashboard and tracking views activated.' 
    });
  } catch (error: any) {
    console.error("❌ Handshake Initialization Failure:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * REGULAR GPS PING UPDATE
 * Enhanced to handle real-time dispatch alerts on status updates
 */
export const handleLocationUpdate = async (req: Request, res: Response) => {
  try {
    const { tripId, lat, lng }: LocationUpdateBody = req.body;

    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ error: 'tripId, lat, and lng are required.' });
    }

    // Sync live marker changes inside PostGIS layout
    await LocationService.updateTripLocation({ tripId, lat, lng });

    // Fetch parent trip context to broadcast plate numbers to the Live Map view
    const { data: tripContext } = await supabase
      .from("trips")
      .select("bus_id, company_id, ride_status")
      .eq("id", tripId)
      .maybeSingle();

    // Transmit structural telemetry data downstream to sockets
    const io = req.app.get('socketio'); 
    if (io) {
      const livePayload = {
        tripId,
        plate_number: tripContext?.bus_id || "Fleet Vehicle",
        ride_status: tripContext?.ride_status || "in-progress",
        lat,
        lng,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast globally to update map tracks and targeted company channels
      io.to(tripId).emit('location-update', livePayload); 
      if (tripContext?.company_id) {
        io.to(`company-${tripContext.company_id}`).emit('fleet-map-sync', livePayload);
      }
    }

    return res.status(200).json({ 
      status: 'success', 
      message: 'Location synchronized and broadcasted to live workspace interfaces.' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * NEW: ADVANCE CURRENT STOP MATRIX (Figma: "MARK AS ARRIVED")
 * Tracks active route progression and updates tracking channels instantaneously.
 */
export const handleAdvanceStop = async (req: Request, res: Response) => {
  try {
    const { tripId, completedStop } = req.body;

    if (!tripId || !completedStop) {
      return res.status(400).json({ error: 'tripId and completedStop parameters are required.' });
    }

    // 1. Advance the database record context (Update stop state fields in your trips table)
    const { error: dbError } = await supabase
      .from('trips')
      .update({ 
        current_stop_logs: `Arrived at ${completedStop}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (dbError) throw dbError;

    // Fetch details to map corporate company broadcasts
    const { data: tripContext } = await supabase
      .from("trips")
      .select("company_id")
      .eq("id", tripId)
      .maybeSingle();

    // 2. Broadcast the progress transition across WebSockets to update passenger sidebars & manager grids
    const io = req.app.get('socketio');
    if (io) {
      const progressionPayload = {
        tripId,
        completedStop,
        timestamp: new Date().toISOString(),
        message: `Bus arrived at ${completedStop}`
      };

      io.to(tripId).emit('route-progression', progressionPayload);
      if (tripContext?.company_id) {
        io.to(`company-${tripContext.company_id}`).emit('fleet-progression-sync', progressionPayload);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Progress step for ${completedStop} logged and transmitted successfully.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * BATCH SYNC (Offline Breadcrumbs Handler)
 */
export const handleBatchSync = async (req: Request, res: Response) => {
  try {
    const { batch } = req.body;

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Batch data is empty or invalid" });
    }

    await LocationService.syncBatchLocations(batch);

    return res.status(200).json({ status: 'success', message: `Synced ${batch.length} tracking points` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * PRODUCTION LIVE LOCATION FETCH
 * Serves perfectly decoded coordinate objects straight to your frontend mapUI
 */
export const getLiveLocation = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required.' });
    }

    // Call your updated service layer that processes the PostGIS hex binary string
    const location = await LocationService.getLatestTripLocation(tripId as string);

    if (!location) {
      return res.status(404).json({ error: 'No location tracking data found for this trip profile.' });
    }

    return res.status(200).json({
      status: 'success',
      data: location
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * NEW: FETCH CHROMATIC TRAIL HISTORIES (Passenger Map Polylines)
 * Extracts a clean array of coordinates from the backend LocationService
 */
export const getTripHistoryPath = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({ error: "tripId parameter is required." });
    }

    // Call the refactored, strongly typed PostGIS route path loader method
    const pathCoordinates = await LocationService.getTripRouteHistory(tripId as string);

    return res.status(200).json({
      status: 'success',
      data: pathCoordinates
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * NEARBY BUSES (Spatial Radius Lookup Search)
 */
export const getNearbyBuses = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Valid lat and lng query params are required" });
    }

    const buses = await LocationService.searchBusesNearby(lat, lng, radius);

    return res.status(200).json({
      status: 'success',
      count: buses.length,
      data: buses
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
