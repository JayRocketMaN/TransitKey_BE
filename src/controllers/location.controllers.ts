import { Request, Response } from 'express';
import { LocationService } from '../services/location.services.js';
import { TripService } from '../services/trip.services.js';
import { LocationUpdateBody } from '../types/location.interface.js';
import { supabase } from '../config/supabase.js'; // Imported to execute the raw row dump

/**
 *START TRIP (The Handshake)
 */
export const handleStartTrip = async (req: Request, res: Response) => {
  try {
    const { tripId, lat, lng }: LocationUpdateBody = req.body;

    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ error: 'tripId, lat, and lng are required to start trip.' });
    }

    await TripService.startTrip(tripId, lat, lng);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Trip started successfully. Live tracking active.' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 *REGULAR GPS PING UPDATE
 */
export const handleLocationUpdate = async (req: Request, res: Response) => {
  try {
    const { tripId, lat, lng }: LocationUpdateBody = req.body;

    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ error: 'tripId, lat, and lng are required.' });
    }

    // Sync live marker changes inside PostGIS layout
    await LocationService.updateTripLocation({ tripId, lat, lng });

    // Transmit coordinates over Socket.io pipeline channel room
    const io = req.app.get('socketio'); 
    if (io) {
      io.to(tripId).emit('location-update', { tripId, lat, lng }); 
    }

    return res.status(200).json({ 
      status: 'success', 
      message: 'Location synchronized and broadcasted.' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 *BATCH SYNC (Offline Breadcrumbs Handler)
 */
export const handleBatchSync = async (req: Request, res: Response) => {
  try {
    const { batch } = req.body;

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Batch data is empty or invalid" });
    }

    await LocationService.syncBatchLocations(batch);

    return res.status(200).json({ status: 'success', message: `Synced ${batch.length} points` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 *PRODUCTION LIVE LOCATION FETCH
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
      return res.status(404).json({ error: 'No location data found for this trip.' });
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
 *NEARBY BUSES (Spatial Radius Lookup Search)
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
