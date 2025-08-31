import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
// import { messageLimiter } from '../middleware/security';

const router = Router();

// All message routes require authentication
router.use(authenticateToken);

// Message CRUD operations
// router.post('/', messageLimiter, MessageController.sendMessageValidation, MessageController.sendMessage);
router.get('/search', MessageController.searchMessages);
router.get('/:messageId', MessageController.getMessage);
router.put('/:messageId', MessageController.editMessage);
router.delete('/:messageId', MessageController.deleteMessage);

export default router;