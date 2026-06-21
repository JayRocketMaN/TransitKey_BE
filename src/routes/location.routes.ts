import { Router } from 'express';
import * as locationController from '../controllers/location.controllers.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

//Start trip and live tracking
router.post('/start', authorize(['driver']), locationController.handleStartTrip);


//Regular Update: Single GPS ping
router.post('/update', authorize(['driver']), locationController.handleLocationUpdate);

// Shared route for Drivers (to verify their ping), Operators, and Passengers
router.get('/live/:tripId', locationController.getLiveLocation);


// Sync coordinates collected during offline/dead-zones
router.post('/batch-sync', authorize(['driver']), locationController.handleBatchSync);

export default router;
