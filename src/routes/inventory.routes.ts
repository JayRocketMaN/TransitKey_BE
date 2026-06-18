import { Router } from "express";
import { VehicleController } from "../controllers/inventory.controllers.js"; // Updated to matching class filename
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 🔒 PROTECTED OPERATOR ROUTE: Add a brand-new bus to the company fleet registry
router.post("/add", authorize(["admin"]), VehicleController.addVehicle);

// 🔒 PROTECTED FLEET VIEW: Allows administrators and drivers to view their park's registered fleet
router.get("/my-fleet", authorize(["admin", "driver"]), VehicleController.getOperatorVehicles);

// 🔒 PROTECTED OPERATOR ROUTE: Update configuration parameters or status for an existing vehicle asset
router.put("/update", authorize(["admin"]), VehicleController.updateVehicle);

export default router;
