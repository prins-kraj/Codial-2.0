import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.registerValidation, AuthController.register);
router.post('/login', AuthController.loginValidation, AuthController.login);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/me', authenticateToken, AuthController.me);
router.post('/refresh', authenticateToken, AuthController.refreshToken);

export default router;