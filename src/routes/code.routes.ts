import { Router } from "express";
import { refrenceCode } from "../controllers/code.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

//Generate code on the go for drivers
router.post("/generate", authorize(["admin"]), refrenceCode); 

export default router;
