import { Request, Response } from 'express';
import * as fleetService from '../services/fleet.services.js'; 

/**
 * Handles the global marketplace view.
 * Passengers use this to find buses based on route, company, or availability.
 */
export const getFleetOverview = async (req: Request, res: Response) => {
  try {
    // 1. Extract query filters (e.g., /api/fleet/overview?origin=Lagos&destination=Abuja)
    const { company, origin, destination } = req.query;

    // 2. Call the service with the filters
    // We cast them as strings so TypeScript knows how to handle them
    const fleetData = await fleetService.getGlobalFleetOverview({
      companyName: company as string,
      origin: origin as string,
      destination: destination as string
    });

    // 3. Return the results
    return res.status(200).json({
      status: 'success',
      count: fleetData?.length || 0,
      data: fleetData
    });

  } catch (error: any) {
    // Log the error for the dev, but send a clean message to the user
    console.error('Landing Page Controller Error:', error.message);
    
    return res.status(500).json({ 
      error: 'Unable to load bus availability at this time.' 
    });
  }
};
