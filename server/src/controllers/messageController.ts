import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { SocketHelpers } from '../utils/socketHelpers';
import { NotFoundError, AuthorizationError } from '../middleware/errorHandler';

export class MessageController {
  // Message validation
  static sendMessageValidation = [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters'),
    body('roomId').isString().notEmpty().withMessage('Room ID is required'),
  ];

  // Send message via REST API (alternative to WebSocket)
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

      const { content, roomId } = req.body;

      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: req.user.id,
            roomId: roomId,
          },
        },
        include: {
          room: true,
        },
      });

      if (!userRoom) {
        throw new AuthorizationError('Access denied to room');
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          userId: req.user.id,
          roomId: roomId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Update room's last activity
      await prisma.room.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      // Broadcast message via WebSocket
      SocketHelpers.broadcastToRoom(roomId, 'message_received', message);

      res.status(201).json({
        success: true,
        data: message,
        message: 'Message sent successfully',
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
      });
    }
  }

  // Edit message
  static async editMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Message content cannot be empty',
        });
        return;
      }

      if (content.length > 1000) {
        res.status(400).json({
          success: false,
          error: 'Message too long (max 1000 characters)',
        });
        return;
      }

      // Find message and verify ownership
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      if (message.userId !== req.user.id) {
        throw new AuthorizationError('You can only edit your own messages');
      }

      // Check if message is too old to edit (24 hours)
      const messageAge = Date.now() - message.createdAt.getTime();
      const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (messageAge > maxEditAge) {
        res.status(400).json({
          success: false,
          error: 'Message is too old to edit (max 24 hours)',
        });
        return;
      }

      // Update message
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: content.trim(),
          editedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Broadcast message update via WebSocket
      SocketHelpers.broadcastToRoom(
        message.roomId,
        'message_updated',
        updatedMessage
      );

      res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Message updated successfully',
      });
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Edit message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to edit message',
      });
    }
  }

  // Delete message
  static async deleteMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { messageId } = req.params;

      // Find message and verify ownership
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      if (message.userId !== req.user.id) {
        throw new AuthorizationError('You can only delete your own messages');
      }

      // Delete message
      await prisma.message.delete({
        where: { id: messageId },
      });

      // Broadcast message deletion via WebSocket
      SocketHelpers.broadcastToRoom(message.roomId, 'message_deleted', {
        messageId: messageId,
        roomId: message.roomId,
      });

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message',
      });
    }
  }

  // Get message details
  static async getMessage(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { messageId } = req.params;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              isPrivate: true,
            },
          },
        },
      });

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Check if user has access to the room
      if (message.room.isPrivate) {
        const userRoom = await prisma.userRoom.findUnique({
          where: {
            userId_roomId: {
              userId: req.user.id,
              roomId: message.roomId,
            },
          },
        });

        if (!userRoom) {
          throw new AuthorizationError('Access denied to message');
        }
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Get message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch message',
      });
    }
  }

  // Search messages
  static async searchMessages(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { query, roomId, limit = 20, page = 1 } = req.query as any;

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long',
        });
        return;
      }

      // Build search conditions
      const whereConditions: any = {
        content: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      };

      // If roomId is specified, search only in that room
      if (roomId) {
        // Verify user has access to the room
        const userRoom = await prisma.userRoom.findUnique({
          where: {
            userId_roomId: {
              userId: req.user.id,
              roomId: roomId,
            },
          },
        });

        if (!userRoom) {
          throw new AuthorizationError('Access denied to room');
        }

        whereConditions.roomId = roomId;
      } else {
        // Search only in rooms user has access to
        const userRooms = await prisma.userRoom.findMany({
          where: { userId: req.user.id },
          select: { roomId: true },
        });

        whereConditions.roomId = {
          in: userRooms.map(ur => ur.roomId),
        };
      }

      // Search messages
      const messages = await prisma.message.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.min(parseInt(limit), 50), // Max 50 results per request
        skip: (parseInt(page) - 1) * parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: messages.length === parseInt(limit),
          },
        },
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search messages',
      });
    }
  }
}
