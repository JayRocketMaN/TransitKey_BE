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
// FIXED: Included passengerRegisterRules to ensure field schemas map correctly
import { registerRules, loginRules, passengerRegisterRules } from '../middleware/input.middleware.js';

const router = Router();

/* ==========================================================================
   🌐 PUBLIC AUTH ENDPOINTS (Accessible Without Existing Session Cookies)
   ========================================================================== */
// Operators use /api/parks/register. Passports/Admins can use this fallback layout:
router.post('/register', registerRules, register);

// 🟢 ADDED: Explicitly isolated pathway matching your passenger UI registration forms
router.post('/passenger/register', passengerRegisterRules, register);

// Flexible login endpoint supporting email or phone number identifiers
router.post('/login', loginRules, login);

router.post('/activate', activateDriver); 
router.post('/logout', logout);

/* ==========================================================================
   🔒 PROTECTED ROLE-SPECIFIC ENDPOINTS (Requires Valid JWT Session)
   ========================================================================== */
// Returns active session metadata profile info for any valid role
router.get('/me', authorize(['passenger', 'driver', 'admin']), getProfile); 

// Populates the real-time driver mobile app ledger profiles
router.get('/driver', authorize(['driver']), getDriverDashboard);

// Populates the master administrative management analytics interface windows
router.get('/operator', authorize(['admin']), getOperatorDashboard);

// Rotates or refreshes expiring administrative/driver cookie sessions
router.post("/refresh-token", authorize(["admin", "driver"]), newToken);

export default router;
