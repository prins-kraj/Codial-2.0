import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserPresenceManager } from '../utils/redis';
import { NotFoundError } from '../middleware/errorHandler';

export class UserController {
  // Update user profile validation
  static updateProfileValidation = [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  ];

  // Get online users
  static async getOnlineUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get users who are currently online (have active sessions)
      const onlineUsers = await prisma.user.findMany({
        where: {
          status: 'ONLINE',
          lastSeen: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Active in last 5 minutes
          },
        },
        select: {
          id: true,
          username: true,
          status: true,
          lastSeen: true,
        },
        orderBy: {
          username: 'asc',
        },
      });

      res.status(200).json({
        success: true,
        data: onlineUsers,
      });
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch online users',
      });
    }
  }

  // Get user profile
  static async getUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          status: true,
          createdAt: true,
          lastSeen: true,
          userRooms: {
            include: {
              room: {
                select: {
                  id: true,
                  name: true,
                  isPrivate: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
              createdRooms: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const userProfile = {
        id: user.id,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        stats: {
          messageCount: user._count.messages,
          roomsCreated: user._count.createdRooms,
          roomsJoined: user.userRooms.length,
        },
        rooms: user.userRooms.map(ur => ur.room),
      };

      res.status(200).json({
        success: true,
        data: userProfile,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  }

  // Update user profile
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { username } = req.body;
      const updateData: any = {};

      if (username && username !== req.user.username) {
        // Check if username is already taken
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser && existingUser.id !== req.user.id) {
          res.status(409).json({
            success: false,
            error: 'Username already taken',
          });
          return;
        }

        updateData.username = username;
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  // Update user status
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;

      if (!['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be ONLINE, AWAY, or OFFLINE',
        });
        return;
      }

      // Update user status in database
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          status,
          lastSeen: new Date(),
        },
        select: {
          id: true,
          username: true,
          status: true,
          lastSeen: true,
        },
      });

      // Update status in Redis
      switch (status) {
        case 'ONLINE':
          await UserPresenceManager.setUserOnline(req.user.id, 'manual-update');
          break;
        case 'AWAY':
          await UserPresenceManager.setUserAway(req.user.id);
          break;
        case 'OFFLINE':
          await UserPresenceManager.setUserOffline(req.user.id);
          break;
      }

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Status updated successfully',
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update status',
      });
    }
  }

  // Get user's joined rooms
  static async getUserRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRooms = await prisma.userRoom.findMany({
        where: { userId: req.user.id },
        include: {
          room: {
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                },
              },
              _count: {
                select: {
                  messages: true,
                  userRooms: true,
                },
              },
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });

      const roomsWithDetails = userRooms.map(ur => ({
        ...ur.room,
        joinedAt: ur.joinedAt,
        lastReadAt: ur.lastReadAt,
        memberCount: ur.room._count.userRooms,
        messageCount: ur.room._count.messages,
      }));

      res.status(200).json({
        success: true,
        data: roomsWithDetails,
      });
    } catch (error) {
      console.error('Get user rooms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user rooms',
      });
    }
  }
}