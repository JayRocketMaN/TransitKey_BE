import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CustomJwtPayload } from "../types/express.js";

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // DEBUG LOGS - Check your terminal!
      console.log("--- Auth Middleware Debug ---");
      console.log("All Cookies:", req.cookies); 
      console.log("Access Token:", req.cookies?.accessToken);
      console.log("JWT Secret Loaded:", !!process.env.JWT_SECRET);

      const accessToken = req.cookies?.accessToken; 

      if (!accessToken) {
        console.log("Error: No accessToken found in cookies");
        return res.status(401).json({ message: "Unauthorized - No token provided" });
      }

      // 2. Verify the token securely
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as CustomJwtPayload;
      
      console.log("Decoded Token Payload:", decoded); // Updated log to see everything inside the cookie
      console.log("Decoded User Role:", decoded.user_role);
      console.log("Allowed Roles:", allowedRoles);

      // 3. Role-based check
      if (!allowedRoles.includes(decoded.user_role)) {
        console.log("Error: Role mismatch. Access Denied.");
        return res.status(403).json({ message: "Access Denied - Insufficient permissions" });
      }

      // 4. Normalize company fields to guarantee req.user.company_id exists
      req.user = {
        ...decoded,
        company_id: decoded.company_id || (decoded as any).companyId
      };
      
      console.log("Final attached req.user configuration:", req.user);
      next();
    } catch (error: any) {
      console.log("JWT Verification Failed:", error.message);
      return res.status(401).json({ message: "Invalid or expired session" });
    }
  };
};
