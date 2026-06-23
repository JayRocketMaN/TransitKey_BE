import { Request, Response } from "express";
import { ParkService } from "../services/park.services.js";

/**
 * Register a new Operator and their Park Company (Unified Interface Form)
 */
export const parkRegister = async (req: Request, res: Response) => {
  try {
    const { company_name, phone_number, email, password, cac_registration_number } = req.body;

    // Basic payload
    if (!company_name || !phone_number || !email || !password || !cac_registration_number) {
      return res.status(400).json({ error: "All account registration fields are required." });
    }

    const existingPark = await ParkService.findParkByName(company_name);
    
  
    if (existingPark && existingPark.id) {
      return res.status(409).json({ error: "This company name is already registered in our system." });
    }

    // Passes password straight through because upstream middleware executes hashing parameters
    const onboardingResult = await ParkService.registerOperatorWithCompany({
      company_name,
      phone_number,
      email,
      password_hash: password,
      cac_registration_number
    });

    return res.status(201).json({
      message: "Operator profile created and transport company registered successfully.",
      data: onboardingResult
    });

  } catch (error: any) {
    console.error("Combined Operator Registration Failure:", error.message);
    if (error.message?.includes("my_users_email_key") || error.code === "23505") {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * Update existing Park settings
 */
export const updatePark = async (req: Request, res: Response) => {
  try {
    const operatorId = req.user?.id;
    if (!operatorId) return res.status(401).json({ error: "Unauthorized" });

    const updatedPark = await ParkService.updateParkByOperator(operatorId, req.body);

    return res.status(200).json({ 
      message: "Park updated successfully",
      data: updatedPark 
    });
  } catch (error: any) {
    console.error("Park Update Failure:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * Fetch comprehensive Park configuration profiles
 */
export const getParkDetails = async (req: Request, res: Response) => {
  try {
    const operatorId = req.user?.id;
    if (!operatorId) return res.status(401).json({ error: "Unauthorized" });

    const getPark = await ParkService.getParkByOperator(operatorId);
    if (!getPark) {
      return res.status(404).json({ error: "No park profile setup found for this operator account." });
    }

    return res.status(200).json({ 
      data: { 
        ...getPark, 
        email: req.user?.email 
      } 
    });
  } catch (error: any) {
    console.error("Park Details Retrieval Failure:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
