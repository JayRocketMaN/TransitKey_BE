import { Router } from "express";
import { parkRegister, updatePark, getParkDetails } from "../controllers/park.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";
import { registerRules } from "../middleware/input.middleware.js";

const router = Router();

//registerRules to validate fields and handle automatic password single-hashing
router.post("/register", registerRules, parkRegister);
router.get("/details", authorize(['admin']), getParkDetails);
router.patch("/update", authorize(['admin']), updatePark);

export default router;
