import { Router } from "express";
import { submitReport } from "../controllers/report.controllers.js";
// import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Endpoint: POST /api/reports/submit
// Note: Ensure your auth middleware is applied to populate req.user
router.post("/submit", submitReport);

export default router;
