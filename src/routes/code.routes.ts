import { Router } from "express";
import { refrenceCode } from "../controllers/code.controllers.js";
import { authorize } from "../middleware/auth.middleware.js"; // Your auth logic

const router = Router();

// Route: POST /api/reference/generate
router.post("/generate", authorize(["admin"]), refrenceCode); 

export default router;
