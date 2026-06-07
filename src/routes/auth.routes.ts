import { Router } from 'express';
import { register, login, getProfie, getDriverDashboard, getOperatorDashboard  } from '../controllers/auth.controllers.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authorize(['passenger', 'driver', 'operator']), getProfie);
// Role-Specific Dashboards
router.get('/driver', authorize(['driver']), getDriverDashboard);
router.get('/operator', authorize(['operator']), getOperatorDashboard);

export default router;
