import { Router } from 'express';
import { 
  register, 
  login, 
  activateDriver, 
  getProfile, 
  getDriverDashboard, 
  getOperatorDashboard,
  logout,
  newToken 
} from '../controllers/auth.controllers.js';
import { authorize } from '../middleware/auth.middleware.js';
import { registerRules, loginRules, passengerRegisterRules } from '../middleware/input.middleware.js';

const router = Router();

// Operators use /api/parks/register. 
router.post('/register', registerRules, register);

router.post('/passenger/register', passengerRegisterRules, register);

// Flexible login endpoint supporting email or phone number identifiers
router.post('/login', loginRules, login);

router.post('/activate', activateDriver); 
router.post('/logout', logout);

router.get('/me', authorize(['passenger', 'driver', 'admin']), getProfile); 

// Populates the real-time driver profiles
router.get('/driver', authorize(['driver']), getDriverDashboard);

// Populates the master administrative management analytics interface windows
router.get('/operator', authorize(['admin']), getOperatorDashboard);

// Rotates or refreshes expiring administrative/driver cookie sessions
router.post("/refresh-token", authorize(["admin", "driver"]), newToken);

export default router;
