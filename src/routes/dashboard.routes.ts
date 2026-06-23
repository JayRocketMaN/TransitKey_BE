import { Router } from "express";
import { getOverview } from "../controllers/dashboard.controllers.js"; // Import named function
import { authorize } from "../middleware/auth.middleware.js"; 

const router = Router();

// Mount directly
router.get("/overview", authorize(['admin']), getOverview);

export default router;
