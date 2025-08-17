import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/me/profile', UserController.getUserRooms);
router.put('/me/profile', UserController.updateProfileValidation, UserController.updateProfile);
router.put('/me/status', UserController.updateStatus);

// Public user routes
router.get('/online', UserController.getOnlineUsers);
router.get('/:userId', UserController.getUserProfile);

export default router;