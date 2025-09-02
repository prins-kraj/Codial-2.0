import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { profilePictureUpload } from '../utils/fileUpload';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/me/profile', UserController.getUserProfile);
router.put('/me/profile', UserController.updateProfileValidation, UserController.updateProfile);
router.post('/me/profile/picture', profilePictureUpload.single('profilePicture'), UserController.uploadProfilePicture);
router.put('/me/status', UserController.updateStatusValidation, UserController.updateStatus);

// User settings routes
router.get('/me/settings', UserController.getUserSettings);
router.put('/me/settings', UserController.updateSettingsValidation, UserController.updateUserSettings);
router.put('/me/password', UserController.changePasswordValidation, UserController.changePassword);

// User search and discovery
router.get('/search', UserController.searchUsers);

// Public user routes
router.get('/online', UserController.getOnlineUsers);
router.get('/:userId/profile', UserController.getUserProfile);

export default router;