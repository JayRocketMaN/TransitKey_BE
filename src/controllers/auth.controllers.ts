import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services.js'; 
import { ParkService } from '../services/park.services.js'; // Imported to leverage your unified driver transaction logic

/**
 * Registers a new user (Passenger / Operator)
 */
export const register = async (req: Request, res: Response) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Authenticate user via flexible multi-channel identifier and set HttpOnly cookie
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    
    // Allow for flexible email or phone number auth
    const result = await AuthService.validateUser(identifier, password);

    // Diagnostic Log: Verify output from services.ts
    console.log("[AuthController.login] Authenticated User Profile:", result.user);

    // Overwrite baseline defaults with cross-origin capability options to satisfy the Vite Map UI
    res.cookie('accessToken', result.token, {
      ...AuthService.getCookieOptions(),
      httpOnly: true,
      secure: true, // Required for sameSite: "none" browser transfers
      sameSite: "none", // Allows localhost cross-port token transmissions
      path: '/'
    });

    res.status(200).json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

/**
 * Initial activation for drivers via reference code.
 * Refactored to be perfectly BACKWARDS-COMPATIBLE with your old Postman execution scripts 
 * while natively processing the new descriptive fields from your Driver Onboarding layout.
 */
export const activateDriver = async (req: Request, res: Response) => {
  try {
    // Gracefully handle parameter extraction across both old and new naming variants
    const operatorCode = req.body.code || req.body.operator_code;
    const rawPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword || req.body.password; // Graceful fallback mirrors old payloads
    const phoneNumber = req.body.phone_number || req.body.phone || "";

    // 1. Mandatory presence validation checks
    if (!operatorCode || !rawPassword) {
      return res.status(400).json({ error: "Missing required operational parameters (code/operator_code and password)." });
    }

    // 2. Perform frontend password parity matching rules validation check
    if (rawPassword !== confirmPassword) {
      return res.status(400).json({ error: "Password verification check failure. Passwords do not match." });
    }

    const cleanCode = String(operatorCode).trim();
    if (cleanCode.length !== 6) {
      return res.status(400).json({ error: "Operator Activation Code must be a clean 6-digit text identifier string." });
    }

    // 3. Fire the unified transaction handler block now clean-merged inside your ParkService
    const activatedUser = await ParkService.finalizeDriverOnboardingTransaction(
      cleanCode,
      rawPassword, // Passes down the password context cleanly (Hash wrap can layer internally or within service)
      String(phoneNumber).trim()
    );

    // 4. Return the exact verification string text payload expected by your existing Postman test suite
    res.status(200).json({ 
      message: "Account activated. You can now login.",
      developer_note: "Successfully updated database registration profiles context.",
      activated_id: activatedUser.id
    });

  } catch (error: any) {
    console.error(" [AuthController.activateDriver] Processing Failure:", error.message);
    res.status(400).json({ error: error.message || "Failed to process driver platform validation." });
  }
};

/**
 * Driver-specific dashboard data
 */
export const getDriverDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User ID not found in session" });

    const driverData = await AuthService.fetchDriverDashboardData(userId);

    const recentTrips = driverData.driver_profiles?.flatMap((profile: any) => profile.trips || []) || [];

    res.status(200).json({ 
      role: 'driver',
      welcome_message: `Welcome back, ${driverData.full_name}`,
      profile: driverData.driver_profiles,
      recent_trips: recentTrips
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

/**
 * Operator-specific dashboard data
 */
export const getOperatorDashboard = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ error: "Operator is not assigned to a company" });
    }

    res.status(200).json({
      role: 'operator',
      company_id: companyId,
      message: "Operator dashboard data loaded successfully"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Returns current logged in user info
 */
export const getProfile = async (req: Request, res: Response) => {
  res.status(200).json({
    authenticated: true,
    user: req.user 
  });
};

/**
 * Clears the auth cookie
 */
export const logout = (req: Request, res: Response) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
    path: '/',
  });
  res.status(200).json({ message: "Logged out successfully" });
};

/**
 * Generates a fresh token (Refresh logic)
 */
export const newToken = (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User context not found" });

    const payload = { 
      id: req.user.id,
      user_role: req.user.user_role,
      company_id: req.user.company_id,
      email: req.user.email 
    };

    const newAccessToken = AuthService.generateAccessToken(payload);
    
    res.cookie("accessToken", newAccessToken, {
      ...AuthService.getCookieOptions(),
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: '/'
    });

    return res.status(201).json({ message: "successful" });
  } catch (error: any) {
    return res.status(401).json({ message: "invalid refresh token" });
  }
};
