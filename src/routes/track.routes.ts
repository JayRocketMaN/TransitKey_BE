import { Router } from "express";
import * as RouteController from "../controllers/track.controllers.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Operator-specific routes
router.post("/add", authorize(["admin"]), RouteController.addRoute);
router.get("/my-routes", authorize(["admin", "driver"]), RouteController.getRoutes);
router.put("/update", authorize(["admin"]), RouteController.updateRoute);

// Public/General route
router.get("/all", RouteController.getAllRoutes);

export default router;
