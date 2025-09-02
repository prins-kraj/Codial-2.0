import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { DirectMessageRepository } from '../repositories/DirectMessageRepository';
import { SocketHelpers } from '../utils/socketHelpers';
import { NotFoundError, AuthorizationError } from '../middleware/errorHandler';

export class DirectMessageController {
  private static repository = new DirectMessageRepository();

  // Validation rules
  static sendMessageValidation = [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters'),
    body('receiverId')
      .isString()
      .notEmpty()
      .withMessage('Receiver ID is required'),
  ];

  static editMessageValidation = [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters'),
  ];

  /**
   * Get all direct message conversations for the authenticated user
   */
  static async getConversations(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const conversations = await DirectMessageController.repository.getUserConversations(
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: conversations,
        message: 'Conversations retrieved successfully',
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversations',
      });
    }
  }

  /**
   * Get messages with a specific user
   */
  static async getMessagesWithUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0, before } = req.query as any;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      // Prevent users from messaging themselves
      if (userId === req.user.id) {
        res.status(400).json({
          success: false,
          error: 'Cannot retrieve messages with yourself',
        });
        return;
      }

      const options: any = {
        limit: Math.min(parseInt(limit), 100), // Max 100 messages per request
        offset: parseInt(offset) || 0,
      };

      if (before) {
        options.before = new Date(before);
      }

      const messages = await DirectMessageController.repository.getMessagesBetweenUsers(
        req.user.id,
        userId,
        options
      );

      res.status(200).json({
        success: true,
        data: {
          messages,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: messages.length === options.limit,
          },
        },
        message: 'Messages retrieved successfully',
      });
    } catch (error) {
      console.error('Get messages with user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve messages',
      });
    }
  }

  /**
   * Send a direct message
   */
  static async sendMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { content, receiverId } = req.body;

      // Prevent users from messaging themselves
      if (receiverId === req.user.id) {
        res.status(400).json({
          success: false,
          error: 'Cannot send message to yourself',
        });
        return;
      }

      // Create the direct message
      const message = await DirectMessageController.repository.create({
        content: content.trim(),
        senderId: req.user.id,
        receiverId,
      });

      // Send message via WebSocket to both sender and receiver
      SocketHelpers.sendToUser(receiverId, 'direct_message_received', message);
      SocketHelpers.sendToUser(req.user.id, 'direct_message_sent', message);

      res.status(201).json({
        success: true,
        data: message,
        message: 'Direct message sent successfully',
      });
    } catch (error) {
      console.error('Send direct message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send direct message',
      });
    }
  }

  /**
   * Edit a direct message
   */
  static async editMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { messageId } = req.params;
      const { content } = req.body;

      // Get the original message to get receiver info for broadcasting
      const originalMessage = await DirectMessageController.repository.findById(messageId);
      if (!originalMessage) {
        throw new NotFoundError('Message not found');
      }

      // Update message using repository with validation
      const updatedMessage = await DirectMessageController.repository.updateMessage(
        messageId,
        content,
        req.user.id
      );

      // Send message update via WebSocket
      SocketHelpers.sendToUser(
        originalMessage.receiverId,
        'direct_message_edited',
        updatedMessage
      );
      SocketHelpers.sendToUser(
        originalMessage.senderId,
        'direct_message_edited',
        updatedMessage
      );

      res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Direct message updated successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
        
        if (error.message.includes('You can only edit') || error.message.includes('too old')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      console.error('Edit direct message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to edit direct message',
      });
    }
  }

  /**
   * Delete a direct message
   */
  static async deleteMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { messageId } = req.params;

      // Get the original message to get receiver info for broadcasting
      const originalMessage = await DirectMessageController.repository.findById(messageId);
      if (!originalMessage) {
        throw new NotFoundError('Message not found');
      }

      // Delete message using repository with validation
      await DirectMessageController.repository.deleteMessage(messageId, req.user.id);

      // Send message deletion via WebSocket
      SocketHelpers.sendToUser(originalMessage.receiverId, 'direct_message_deleted', {
        messageId,
        senderId: originalMessage.senderId,
        receiverId: originalMessage.receiverId,
      });
      SocketHelpers.sendToUser(originalMessage.senderId, 'direct_message_deleted', {
        messageId,
        senderId: originalMessage.senderId,
        receiverId: originalMessage.receiverId,
      });

      res.status(200).json({
        success: true,
        message: 'Direct message deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
        
        if (error.message.includes('You can only delete')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      console.error('Delete direct message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete direct message',
      });
    }
  }

  /**
   * Search direct messages
   */
  static async searchMessages(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { query, userId, limit = 20, page = 1 } = req.query as any;

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long',
        });
        return;
      }

      const options = {
        partnerId: userId,
        limit: Math.min(parseInt(limit), 50), // Max 50 results per request
        offset: (parseInt(page) - 1) * parseInt(limit),
      };

      const messages = await DirectMessageController.repository.searchMessages(
        req.user.id,
        query.trim(),
        options
      );

      res.status(200).json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: options.limit,
            hasMore: messages.length === options.limit,
          },
        },
        message: 'Search completed successfully',
      });
    } catch (error) {
      console.error('Search direct messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search messages',
      });
    }
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      await DirectMessageController.repository.markAsRead(req.user.id, userId);

      res.status(200).json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark messages as read',
      });
    }
  }
}