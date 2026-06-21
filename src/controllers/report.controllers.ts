import { Request, Response } from "express";
import { ReportService, ReportInput } from "../services/report.services.js";

export const submitReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    
    const { image, category, cartegory, message, report_type, location, location_name } = req.body;

    //Fetch passenger's current active transit trip
    const { data: currentTrip, error: tripError } = await ReportService.getLatestTrip(userId);
    if (tripError) return res.status(500).json({ error: tripError.message });
    if (!currentTrip) return res.status(404).json({ message: "No active trip found" });

    //Fetch driver and vehicle profile data to extract ownership boundaries
    const { data: driver, error: driverError } = await ReportService.getDriver(currentTrip.driver_id);
    if (driverError || !driver) return res.status(404).json({ message: "Driver profile or vehicle not found" });

    //Complete reporting columns
    const reportData: ReportInput = {
      image_url: image,
      category: category || cartegory,
      message,
      report_type: report_type || "Emergency",
      location,
      location_name,
      
      // CRITICAL DATA FOR OPERATOR FILTERING MATRIX:
      vehicle_id: currentTrip.vehicle_id,
      driver_id: currentTrip.driver_id,
      park_id: driver.park_id,            // Essential for the getEmergencyReports operator route
      company_name: driver.company_name,  // Explicit index property for faster query indexing
      status: "pending"                   // Sets an initial baseline filtering index state
    };

    //Save to the database
    const { error: reportError } = await ReportService.createReport(userId, currentTrip, reportData);
    if (reportError) return res.status(500).json({ error: reportError.message });

    return res.status(201).json({ message: "Report submitted successfully" });
  } catch (error: any) {
    console.error('Submit Report Flow Error:', error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
