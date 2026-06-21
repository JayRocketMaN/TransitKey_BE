import { Router } from "express";
import { submitReport } from "../controllers/report.controllers.js";

const router = Router();

//Submit report for both drivers and passengers
router.post("/submit", submitReport);

export default router;
