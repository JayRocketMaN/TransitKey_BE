import { Router } from "express";
import * as AssignmentController from "../controllers/assign.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/assign", authorize(['admin']), AssignmentController.assignDriver);
router.get("/my-assignments", authorize(['admin']), AssignmentController.getAssignments);
router.put("/reassign", authorize(['admin']), AssignmentController.updateAssignment);

export default router;
