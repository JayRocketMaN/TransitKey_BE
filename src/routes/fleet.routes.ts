import { Router } from 'express';
import * as summaryController from '../controllers/fleet.controllers.js';

const router = Router();

// The Landing Page/Search endpoint: Returns prices, seats, and map locations
router.get('/overview', summaryController.getFleetOverview);

export default router;
