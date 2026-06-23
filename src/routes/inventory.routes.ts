import { Router } from "express";
import { VehicleController } from "../controllers/inventory.controllers.js"; 
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @route   POST /api/inventory/add
 * @desc    Add a brand-new bus to the company fleet registry
 * @access  Private (Operators / Park Admins only)
 */
router.post("/add", authorize(["admin"]), VehicleController.addVehicle);

/**
 * @route   GET /api/inventory/my-fleet
 * @desc    Allows admin to view their park's complete registered fleet inventory list
 * @access  Private (Operators / Park Admins only)
 */
router.get("/my-fleet", authorize(["admin"]), VehicleController.getOperatorVehicles);

/**
 * @route   PUT /api/inventory/update
 * @desc    Update configuration profile parameters or execution statuses for an existing vehicle asset
 * @access  Private (Operators / Park Admins only)
 */
router.put("/update", authorize(["admin"]), VehicleController.updateVehicle);

export default router;
