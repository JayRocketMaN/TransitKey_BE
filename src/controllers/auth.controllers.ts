import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services.js'; 

/**
 * Registers a new user (Passenger / Operator fallback)
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
 * Authenticates user via flexible multi-channel identifier and sets HttpOnly cookie
 */
export const login = async (req: Request, res: Response) => {
  try {
    // FIXED: Changed destructuring from 'email' to 'identifier' to match your flexible validation settings
    const { identifier, password } = req.body;
    
    // Aligned to pass your flexible email or phone number string to your service layer
    const result = await AuthService.validateUser(identifier, password);

    // Diagnostic Log: Verify what your service layer is actually outputting
    console.log("🔒 [AuthController.login] Authenticated User Profile:", result.user);

    res.cookie('accessToken', result.token, AuthService.getCookieOptions());

    res.status(200).json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

/**
 * For Drivers: Initial activation via reference code
 */
export const activateDriver = async (req: Request, res: Response) => {
  try {
    const { code, password } = req.body;
    await AuthService.completeDriverActivation(code, password);
    
    res.status(200).json({ message: "Account activated. You can now login." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    res.cookie("accessToken", newAccessToken, AuthService.getCookieOptions());

    return res.status(201).json({ message: "successful" });
  } catch (error: any) {
    return res.status(401).json({ message: "invalid refresh token" });
  }
};
