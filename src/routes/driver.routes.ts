import { Router } from 'express';
import { authorize } from '../middleware/auth.middleware.js';
import { 
  addDriver, 
  getDriver,       // This handles viewing ALL drivers
  getDriverById,   // Added: This handles viewing a SINGLE driver
  editDriver 
} from "../controllers/driver.controllers.js";

const router = Router();
router.use(authorize(['admin']));

// 1. Action: Onboard/Register a new fleet driver
router.post("/register", addDriver);

// 2. Action: View ALL drivers belonging to the admin's park (GET /api/drivers)
router.get("/", getDriver);

// 3. Action: View a SINGLE driver profile by ID (GET /api/drivers/uuid-string)
router.get("/:id", getDriverById);

// 4. Action: Update/Edit an existing driver record (PUT /api/drivers/uuid-string)
router.put("/:id", editDriver); 

export default router;
