import { Request, Response } from "express";
import { AssignmentService } from "../services/assign.services.js";

/**
 * Initial assignment of a driver to a vehicle
 */
export const assignDriver = async (req: Request, res: Response) => {
  try {
    const { vehicle_id, driver_id } = req.body;

    if (!vehicle_id || !driver_id) {
      return res.status(400).json({ error: "vehicle_id and driver_id are required fields." });
    }

    // FIXED: Adjusted to 'admin' to match your database user profile setup
    const currentUserRole = req.user?.user_role || (req.user as any)?.role;
    if (currentUserRole !== "admin") {
      return res.status(403).json({ message: "Access denied. Managers/Admins only." });
    }

    console.log(`📡 Checking busy status for driver: ${driver_id}`);
    
    // 1. Check if driver is already on another vehicle
    const resultCheck = await AssignmentService.checkDriverBusy(driver_id);
    if (resultCheck?.error) return res.status(500).json({ error: resultCheck.error.message });
    
    if (resultCheck?.data) {
      return res.status(409).json({ 
        message: "This driver is already assigned to a vehicle. Use update/rotate mechanism to switch vehicles." 
      });
    }

    console.log(`📡 Proceeding with vehicle injection: ${vehicle_id}`);

    // 2. Perform initial assignment
    const resultAssign = await AssignmentService.assignDriverToVehicle(vehicle_id, driver_id);
    if (resultAssign?.error) return res.status(500).json({ error: resultAssign.error.message });

    return res.status(200).json({ 
      message: "Driver assigned successfully", 
      vehicle: resultAssign?.data || null 
    });
  } catch (error: any) {
    console.error("💥 Assignment Controller Failure:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * Handles Driver Rotation (Reassignment)
 */
export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { vehicle_id, new_driver_id } = req.body;

    if (!vehicle_id || !new_driver_id) {
      return res.status(400).json({ error: "vehicle_id and new_driver_id are required fields." });
    }

    const currentUserRole = req.user?.user_role || (req.user as any)?.role;
    if (currentUserRole !== "admin") {
      return res.status(403).json({ message: "Access denied. Managers/Admins only." });
    }

    // Use the rotation service to release from old and assign to new vehicle
    const resultRotate = await AssignmentService.rotateDriver(vehicle_id, new_driver_id);
    if (resultRotate?.error) return res.status(500).json({ error: resultRotate.error.message });

    return res.status(200).json({ 
      message: "Driver rotation successful. Vehicle updated.", 
      vehicle: resultRotate?.data || null 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get fleet assignments based on role
 */
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.user_role || (req.user as any)?.role;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // FIXED: Adjusted check strings to use 'admin'
    if (userRole === "admin") {
      const resultFleet = await AssignmentService.getOperatorFleet();
      if (resultFleet?.error) return res.status(500).json({ error: resultFleet.error.message });
      return res.status(200).json({ role: "admin", assignments: resultFleet?.data || [] });

    } else if (userRole === "driver") {
      const resultDriver = await AssignmentService.getDriverAssignment(userId);
      if (resultDriver?.error) return res.status(500).json({ error: resultDriver.error.message });
      if (!resultDriver?.data) return res.status(404).json({ message: "No vehicle assigned yet." });
      return res.status(200).json({ role: "driver", vehicle: resultDriver.data });
    }

    return res.status(403).json({ message: "Unauthorized profile access." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
