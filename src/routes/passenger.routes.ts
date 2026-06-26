import { Router } from 'express';
import * as passengerController from '../controllers/passenger.controllers.js';

const router = Router();

// Radius lookup scan using browser coordinates
router.get('/nearby', passengerController.getNearbyBuses);

// Text route query search block
router.get('/search', passengerController.searchTrips);

export default router;
