import { Request, Response } from 'express';
import { PassengerService } from '../services/passenger.services.js';

/**
 * Spatial Radius Lookup Search for Passengers
 * GET /api/passenger/nearby?lat=6.5244&lng=3.3792&radius=5000
 */
export const getNearbyBuses = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Valid lat and lng query parameters are required." });
    }

    const buses = await PassengerService.locateAvailableFleetNearby(lat, lng, radius);

    return res.status(200).json({
      status: 'success',
      count: buses.length,
      data: buses
    });
  } catch (error: any) {
    console.error("Controller Nearby Buses Error:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * Text-Based Route Searching for Passengers
 * GET /api/passenger/search?origin=Jibowu&destination=Ibadan
 */
export const searchTrips = async (req: Request, res: Response) => {
  try {
    const origin = req.query.origin as string;
    const destination = req.query.destination as string;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Both origin and destination search strings are required." });
    }

    const matchingTrips = await PassengerService.searchTripsByRoute(origin, destination);

    return res.status(200).json({
      status: 'success',
      count: matchingTrips.length,
      data: matchingTrips
    });
  } catch (error: any) {
    console.error("Controller Search Trips Error:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
