import { Router } from 'express';
import * as locationController from '../controllers/location.controllers.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Start trip and live tracking 
router.post('/start', authorize(['driver']), locationController.handleStartTrip);

// Regular Update: Single GPS ping from driver's telemetry device
router.post('/update', authorize(['driver']), locationController.handleLocationUpdate);

// Shared route for Drivers (to verify their ping), Operators, and Passengers
router.get('/live/:tripId', locationController.getLiveLocation);

// Sync coordinates collected during offline/dead-zones (Expanded to admin role for diagnostic sync pushes)
router.post('/batch-sync', authorize(['admin', 'driver']), locationController.handleBatchSync);
// Route references to add inside location.routes.ts
router.post('/advance-stop', authorize(['driver']), locationController.handleAdvanceStop);
router.get('/history/:tripId', locationController.getTripHistoryPath);


export default router;
