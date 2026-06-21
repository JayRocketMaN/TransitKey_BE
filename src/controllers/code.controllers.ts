import { Request, Response } from "express";
import { ReferenceService } from "../services/code.services.js";

export const refrenceCode = async (req: Request, res: Response) => {
  try {
    //Validate user context
    const userId = req.user?.id;
    const userName = req.user?.email || "Unknown Admin"; 

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }

    //Call service and handle potential null data or errors
    const { data: codeData, error: codeError } = 
      await ReferenceService.createReferenceCode(userId, userName);

    if (codeError || !codeData) {
      return res.status(500).json({ 
        error: codeError?.message || "Could not generate code" 
      });
    }

    //Return the generated code
    return res.status(201).json({
      code: codeData.code,
    });
    
  } catch (error: any) {
    // Catch errors
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
