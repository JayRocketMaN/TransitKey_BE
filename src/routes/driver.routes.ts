import { Router } from 'express';
import { authorize } from '../middleware/auth.middleware.js';
import { 
  addDriver, 
  getDriver,       
  getDriverById,   
  editDriver 
} from "../controllers/driver.controllers.js";

const router = Router();
router.use(authorize(['admin']));

//Onboard/Register a new fleet driver
router.post("/register", addDriver);

//View all drivers belonging to the admin's park
router.get("/", getDriver);

// View a driver profile by ID
router.get("/:id", getDriverById);

//Update/Edit an existing driver record
router.put("/:id", editDriver); 

export default router;
