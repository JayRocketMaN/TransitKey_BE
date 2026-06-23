import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.services.js";

// Export as an independent, named async function
export const getOverview = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id; 

    if (!companyId) {
      return res.status(401).json({ 
        error: "Unauthorized access: No corporate operational context linked to this user." 
      });
    }

    const telemetryData = await DashboardService.getCompanyTelemetry(companyId);

    return res.status(200).json({
      success: true,
      data: telemetryData
    });

  } catch (error: any) {
    console.error("Dashboard controller compilation crash:", error.message);
    return res.status(500).json({ 
      error: error.message || "Internal failure compiling workspace telemetry analytics." 
    });
  }
};
