
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ReportService, ReportInput } from "../services/report.services.js";

interface CustomJwtPayload {
  id: string; // Extracts "54398245-e2a0-45fb-84cd-8c8ebef63363" from your token
  user_role?: string;
  company_id?: string;
  email?: string;
}

export const submitReport = async (req: Request, res: Response) => {
  try {
    let token: string | undefined;

    // 1. EXTRACT CUSTOM JWT FROM COOKIES (Updated to support accessToken casing)
    if (req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(cookie => {
          const parts = cookie.trim().split('=');
          return [parts[0], parts.slice(1).join('=')];
        })
      );
      
      // Prioritizes your exact custom cookie key: 'accessToken'
      token = cookies['accessToken'] || cookies['session_token'] || cookies['access_token'];
    }

    // 2. FALLBACK TO BEARER HEADER FOR POSTMAN FLEXIBILITY
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Missing authentication credentials" });
    }

    // 3. VERIFY AND DECODE CUSTOM JWT
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as CustomJwtPayload;
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: "Unauthorized: Invalid token payload profile" });
      }
      
      userId = decoded.id; 
    } catch (jwtError: any) {
      return res.status(401).json({ message: `Unauthorized: Token validation failed (${jwtError.message})` });
    }

    const { image, category, cartegory, message, report_type, location, location_name } = req.body;

    // Fetch passenger's current active transit trip
    const { data: currentTrip, error: tripError } = await ReportService.getLatestTrip(userId);
    if (tripError) return res.status(500).json({ error: tripError.message });
    if (!currentTrip) return res.status(404).json({ message: "No active trip found" });

    // Fetch driver and vehicle profile data to extract ownership boundaries
    const { data: driver, error: driverError } = await ReportService.getDriver(currentTrip.driver_id);
    if (driverError || !driver) return res.status(404).json({ message: "Driver profile or vehicle not found" });

    // Complete reporting columns
    const reportData: ReportInput = {
      image_url: image,
      category: category || cartegory,
      message,
      report_type: report_type || "Emergency",
      location,
      location_name,
      
      // CRITICAL DATA FOR OPERATOR FILTERING MATRIX:
      bus_id: currentTrip.bus_id,
      driver_id: currentTrip.driver_id,
      park_id: driver.park_id,            
      company_name: driver.company_name,  
      status: "pending"                   
    };

    // Save to the database
    const { error: reportError } = await ReportService.createReport(userId, currentTrip, reportData);
    if (reportError) return res.status(500).json({ error: reportError.message });

    return res.status(201).json({ message: "Report submitted successfully" });
  } catch (error: any) {
    console.error('Submit Report Flow Error:', error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
