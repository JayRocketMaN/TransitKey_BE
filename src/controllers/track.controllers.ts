import { Request, Response } from "express";
import { RouteService, RouteInput } from "../services/track.services.js"; // Standardized path

/**
 * Add a new route to the operator's company
 */
export const addRoute = async (req: Request, res: Response) => {
  try {
    const { 
      route_name, 
      start_terminal, 
      end_terminal, 
      distance_km, 
      duration_minutes, 
      fare, 
      stops 
    }: RouteInput = req.body;
    
    const operatorId = req.user?.id;

    if (!operatorId) return res.status(401).json({ message: "Unauthorized" });
    
    // Route validation: Ensure required fields are present
    if (!route_name || !start_terminal || !end_terminal || fare === undefined) {
      return res.status(400).json({ 
        message: "Route name, start terminal, end terminal, and fare are required." 
      });
    }

    console.log(" Searching for company owned by User ID:", operatorId);
    const { data: park, error: parkError } = await RouteService.getParkByOperator(operatorId) as any;
    
    if (parkError || !park) {
        return res.status(404).json({ message: "No company/park found for this operator." });
    }

    // Validation: Enforce that terminal endpoints cannot be identical strings
    const startClean = (start_terminal || "").toLowerCase().trim();
    const endClean = (end_terminal || "").toLowerCase().trim();

    if (startClean && endClean && startClean === endClean) {
      return res.status(400).json({ message: "End terminal cannot match the start terminal." });
    }

    // Call service mapping all parameters under the park context
    const { error: insertError } = await RouteService.createRoute(park.id, { 
      route_name, 
      start_terminal, 
      end_terminal, 
      distance_km: distance_km ? parseFloat(distance_km as any) : null,
      duration_minutes: duration_minutes ? parseInt(duration_minutes as any) : null,
      fare: parseFloat(fare as any),
      stops: Array.isArray(stops) ? stops : []
    });

    if (insertError) {
      // Handles your table's unique_park_route_terminals constraint key rejection
      if (insertError.code === "23505") {
        return res.status(409).json({ message: "This terminal combination already exists for your park." });
      }
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ message: "Route added successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get all routes belonging to the operator's company
 */
export const getRoutes = async (req: Request, res: Response) => {
  try {
    const operatorId = req.user?.id;
    if (!operatorId) return res.status(401).json({ message: "Unauthorized" });

    const { data: park, error: parkError } = await RouteService.getParkByOperator(operatorId) as any;
    if (parkError || !park) return res.status(404).json({ message: "No company found." });

    const { data: routes, error: routesError } = await RouteService.getRoutesByPark(park.id);
    if (routesError) return res.status(500).json({ error: routesError.message });

    const localizedRoutes = routes?.map(route => ({ 
      ...route, 
      origin: park.state_located || "Unknown" 
    })) || [];
    
    return res.status(200).json({ count: localizedRoutes.length, routes: localizedRoutes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Update an existing route
 */
export const updateRoute = async (req: Request, res: Response) => {
  try {
    const { route_id, route_name, start_terminal, end_terminal, distance_km, duration_minutes, fare, stops } = req.body;
    const operatorId = req.user?.id;

    if (!operatorId || !route_id) return res.status(400).json({ message: "Missing required fields." });

    const { data: park, error: parkError } = await RouteService.getParkByOperator(operatorId) as any;
    if (parkError || !park) return res.status(404).json({ message: "Company not found." });

    const updateData: any = { updated_at: new Date().toISOString() };
    
    // Safely structure optional updates for your schema
    if (route_name) updateData.route_name = route_name.trim();
    if (distance_km !== undefined) updateData.distance_km = distance_km ? parseFloat(distance_km) : null;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes ? parseInt(duration_minutes) : null;
    if (fare !== undefined) updateData.fare = parseFloat(fare);
    if (stops !== undefined) updateData.stops = Array.isArray(stops) ? stops : [];

    // Evaluate terminal updates if provided
    if (start_terminal || end_terminal) {
      const activeStart = start_terminal || req.body.current_start_terminal || "";
      const activeEnd = end_terminal || req.body.current_end_terminal || "";
      
      if (activeStart.toLowerCase().trim() === activeEnd.toLowerCase().trim() && activeStart !== "") {
        return res.status(400).json({ message: "Start and end terminal parameters cannot match." });
      }
      
      if (start_terminal) updateData.start_terminal = start_terminal.trim();
      if (end_terminal) updateData.end_terminal = end_terminal.trim();
    }

    const { data: updated, error: updateError } = await RouteService.updateRoute(route_id, park.id, updateData);

    if (updateError) return res.status(500).json({ error: updateError.message });
    if (!updated) return res.status(404).json({ message: "Route not found or unauthorized." });

    return res.status(200).json({ message: "Route updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Public: Fetch all routes with company details
 */
export const getAllRoutes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await RouteService.fetchAllRoutesWithParks();
    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map((r: any) => ({
      route_id: r.id,
      route_name: r.route_name,
      start_terminal: r.start_terminal,
      end_terminal: r.end_terminal,
      distance_km: r.distance_km,
      duration_minutes: r.duration_minutes,
      fare: r.fare,
      stops: r.stops || [],
      starting_point: {
        state: r.companies?.state_located || "Unknown",
        park_name: r.companies?.name || "Unknown Company",
      },
    }));

    return res.status(200).json({ count: formatted.length, routes: formatted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
