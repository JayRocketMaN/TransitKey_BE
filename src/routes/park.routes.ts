import { Router } from "express";
import { parkRegister, updatePark, getParkDetails } from "../controllers/park.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";
// ADDED: Import your validation and hashing rules bundle
import { registerRules } from "../middleware/input.middleware.js";

const router = Router();

// FIXED: Added registerRules to validate fields and handle automatic password single-hashing
router.post("/register", registerRules, parkRegister);

/* ==========================================================================
   🔒 PROTECTED ADMIN ACTIONS 
   ========================================================================== */
router.get("/details", authorize(['admin']), getParkDetails);
router.patch("/update", authorize(['admin']), updatePark);

export default router;
