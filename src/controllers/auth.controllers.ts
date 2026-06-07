import { Request, Response } from 'express';
import * as authService from '../services/auth.services.js';
import * as operatorService from '../services/company.services.js';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.createUser(req.body);
    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.validateUser(email, password);

    // Cookie is now safely inside the function
    res.cookie('accessToken', result.token, {
      httpOnly: true,
      signed: true,
      secure: false, // Set to true in production with HTTPS  
      sameSite: 'strict',
      maxAge: 3600000,
      path: '/',
    });

    res.status(200).json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

export const getProfie = async (req: Request, res: Response) => {
  // req.user is populated by your 'authorize' middleware
  res.status(200).json({
    authenticated: true,
    user: req.user 
  });
};

export const getDriverStats = async (req: Request, res: Response) => {
  res.status(200).json({ message: "Driver dashboard data" });
};

export const getOperatorFleet = async (req: Request, res: Response) => {
  res.status(200).json({ message: "Operator fleet data" });
};


export const activateDriver = async (req: Request, res: Response) => {
  try {
    const { code, password } = req.body;
    // Call a service function to handle the DB updates
    await authService.completeDriverActivation(code, password);
    
    res.status(200).json({ message: "Account activated. You can now login." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getDriverDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in session" });
    }

    // Call the service
    const driverData = await authService.fetchDriverDashboardData(userId);

    // Send the response
    res.status(200).json({ 
      role: 'driver',
      welcome_message: `Welcome back, ${driverData.full_name}`,
      profile: driverData.driver_profiles,
      recent_trips: driverData.trips || []
    });

  } catch (error: any) {
    console.error("Dashboard Error:", error.message);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

export const getOperatorDashboard = async (req: Request, res: Response) => {
  try {
    // req.user.company_id comes from your CustomJwtPayload middleware
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(403).json({ error: "Operator is not assigned to a company" });
    }

    const dashboardData = await operatorService.fetchOperatorDashboardStats(companyId);

    res.status(200).json({
      role: 'operator',
      ...dashboardData
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const logout = (req: Request, res: Response) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0), // Set expiration to the past
    path: '/',
  });
  res.status(200).json({ message: "Logged out successfully" });
};