import { Router } from 'express';
import * as locationController from '../controllers/location.controllers.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

//Start trip and live tracking
// Add parentheses and an array of allowed roles
router.post('/start', locationController.handleStartTrip);


//Regular Update: Single GPS ping
router.post('/update',  locationController.handleLocationUpdate);

// Shared route for Drivers (to verify their ping), Operators, and Passengers
router.get('/live/:tripId', authorize(['driver', 'operator', 'passenger']), locationController.getLiveLocation);


// Sync coordinates collected during offline/dead-zones
router.post('/batch-sync', authorize(['driver']), locationController.handleBatchSync);

export default router;
