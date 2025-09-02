import { Router } from 'express';
import { DirectMessageController } from '../controllers/directMessageController';
import { authenticateToken } from '../middleware/auth';
import { messageLimiter, generalLimiter } from '../middleware/security';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all conversations for the authenticated user
router.get(
  '/',
  DirectMessageController.getConversations
);

// Get messages with a specific user
router.get(
  '/:userId',
  DirectMessageController.getMessagesWithUser
);

// Send a direct message
router.post(
  '/',
  messageLimiter, // 30 messages per minute
  DirectMessageController.sendMessageValidation,
  DirectMessageController.sendMessage
);

// Edit a direct message
router.put(
  '/:messageId',
  generalLimiter, // Use general limiter for edits
  DirectMessageController.editMessageValidation,
  DirectMessageController.editMessage
);

// Delete a direct message
router.delete(
  '/:messageId',
  generalLimiter, // Use general limiter for deletions
  DirectMessageController.deleteMessage
);

// Search direct messages
router.get(
  '/search/messages',
  generalLimiter, // Use general limiter for searches
  DirectMessageController.searchMessages
);

// Mark messages as read
router.put(
  '/:userId/read',
  DirectMessageController.markAsRead
);

export default router;