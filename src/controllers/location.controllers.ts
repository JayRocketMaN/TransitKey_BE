import * as locationService from '../services/location.services.js';
import { LocationUpdateBody } from '../types/location.interface.js';
import { Request, Response } from 'express';
import * as TripStarter from '../services/trip.services.js'

export const handleLocationUpdate = async (req: Request, res: Response) => {
  try {
    const { tripId, lat, lng }: LocationUpdateBody = req.body;

    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ error: 'tripId, lat, and lng are required.' });
    }

    // 1. Persist to Database
    await locationService.updateTripLocation({ tripId, lat, lng });

    // 2. TARGETED BROADCAST (Rooms Implementation)
    const io = req.app.get('socketio'); 
    if (io) {
      // .to(tripId) ensures only clients in that room get the update
      io.to(tripId).emit('location-update', { tripId, lat, lng }); 
      console.log(`📡 Broadcasted update to Room: ${tripId}`);
    }

    return res.status(200).json({ 
      status: 'success', 
      message: 'Location synchronized and broadcasted to room' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};




export const handleBatchSync = async (req: Request, res: Response) => {
  try {
    const { batch } = req.body; // Expecting an array of location objects

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Batch data is empty or invalid" });
    }

    await locationService.syncBatchLocations(batch);

    return res.status(200).json({ status: 'success', message: `Synced ${batch.length} points` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const handleStartTrip = async (req: Request, res: Response) => {
  try {
    const { tripId, lat, lng }: LocationUpdateBody = req.body;

    // Validation
    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ error: 'tripId, initial lat, and lng are required to start trip.' });
    }

    // This calls the RPC we wrote that updates status to 'in-progress' 
    // and inserts the first location record simultaneously.
    await TripStarter.startTrip(tripId, lat, lng);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Trip started successfully. Live tracking active.' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getLiveLocation = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params as { tripId: string }; // Get tripId from URL /api/location/live/:tripId

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required.' });
    }

    const location = await locationService.getLatestTripLocation(tripId);

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
