import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { generalLimiter } from '../middleware/security';

const router = Router();

// All message routes require authentication
router.use(authenticateToken);

// Message CRUD operations
// router.post('/', messageLimiter, MessageController.sendMessageValidation, MessageController.sendMessage);
router.get('/search', MessageController.searchMessages);
router.get('/:messageId', MessageController.getMessage);
router.put(
  '/:messageId',
  generalLimiter,
  MessageController.editMessageValidation,
  MessageController.editMessage
);
router.delete(
  '/:messageId',
  generalLimiter,
  MessageController.deleteMessage
);

export default router;