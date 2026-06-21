import { Request, Response } from 'express';
import * as fleetService from '../services/fleet.services.js'; 

/** 
 * Handles the global marketplace view. 
 * Passengers can use this to find buses based on route, company, or availability. 
 */ 
export const getFleetOverview = async (req: Request, res: Response) => { 
  try { 
    //Extract query filters  
    const { company, origin, destination } = req.query; 

    //Call the service with the filters 
    const fleetData = await fleetService.getGlobalFleetOverview({ 
      companyName: company ? (company as string) : undefined, 
      origin: origin ? (origin as string) : undefined, 
      destination: destination ? (destination as string) : undefined 
    }); 

    //Return the results 
    return res.status(200).json({ 
      status: 'success', 
      count: fleetData?.length || 0, 
      data: fleetData 
    }); 
  } catch (error: any) { 
    // Log the error to terminal, send a clean message to the user 
    console.error('Landing Page Controller Error:', error.message); 
    return res.status(500).json({ error: 'Unable to load bus availability at this time.' }); 
  } 
};
