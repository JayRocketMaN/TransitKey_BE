import { Request, Response } from "express";
import { ReportService, ReportInput } from "../services/report.services.js";

export const submitReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { image, cartegory, message, report_type, location, location_name } = req.body;

    const { data: currentTrip, error: tripError } = await ReportService.getLatestTrip(userId);
    if (tripError) return res.status(500).json({ error: tripError.message });
    if (!currentTrip) return res.status(404).json({ message: "No active trip found" });

    const { data: driver, error: driverError } = await ReportService.getDriver(currentTrip.driver_id);
    if (driverError || !driver) return res.status(404).json({ message: "Driver not found" });

    const reportData: ReportInput = {
      image_url: image,
      category: cartegory,
      message,
      report_type,
      location,
      location_name
    };

    const { error: reportError } = await ReportService.createReport(userId, currentTrip, reportData);
    if (reportError) return res.status(500).json({ error: reportError.message });

    return res.status(201).json({ message: "Report submitted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Server error" });
  }
};
