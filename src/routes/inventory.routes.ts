import { Router } from "express";
import { VehicleController } from "../controllers/inventory.controllers.js"; 
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

//Add a brand-new bus to the company fleet registry
router.post("/add", authorize(["admin"]), VehicleController.addVehicle);

//Allows admin to view their park's registered fleet
router.get("/my-fleet", authorize(["admin"]), VehicleController.getOperatorVehicles);

// Update configuration parameters or status for an existing vehicle asset
router.put("/update", authorize(["admin"]), VehicleController.updateVehicle);

export default router;
