import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserPresenceManager } from '../utils/redis';
import { NotFoundError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/UserRepository';
import { UserSettingsRepository } from '../repositories/UserSettingsRepository';
import { deleteProfilePicture, getProfilePictureUrl, extractFilenameFromUrl } from '../utils/fileUpload';
import { SocketHelpers } from '../utils/socketHelpers';
import bcrypt from 'bcrypt';

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
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
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

      const user = await UserRepository.getUserProfile(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get additional stats
      const stats = await prisma.user.findUnique({
        where: { id: userId },
        select: {
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

      const userProfile = {
        ...user,
        profilePicture: getProfilePictureUrl(user.profilePicture),
        stats: {
          messageCount: stats?._count.messages || 0,
          roomsCreated: stats?._count.createdRooms || 0,
          roomsJoined: stats?.userRooms.length || 0,
        },
        rooms: stats?.userRooms.map(ur => ur.room) || [],
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

      const { username, bio } = req.body;
      const updateData: any = {};

      // Handle username update
      if (username && username !== req.user.username) {
        const isAvailable = await UserRepository.isUsernameAvailable(username, req.user.id);
        if (!isAvailable) {
          res.status(409).json({
            success: false,
            error: 'Username already taken',
          });
          return;
        }
        updateData.username = username;
      }

      // Handle bio update
      if (bio !== undefined) {
        updateData.bio = bio.trim() || null;
      }

      // Update user profile
      const updatedUser = await UserRepository.updateProfile(req.user.id, updateData);

      // Broadcast profile update to connected clients
      const profileData = {
        ...updatedUser,
        profilePicture: getProfilePictureUrl(updatedUser.profilePicture),
      };

      SocketHelpers.broadcastToUser(req.user.id, 'user_profile_updated', {
        userId: req.user.id,
        profile: profileData,
      });

      res.status(200).json({
        success: true,
        data: profileData,
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

  // Upload profile picture
  static async uploadProfilePicture(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      // Get current user to check for existing profile picture
      const currentUser = await UserRepository.getUserProfile(req.user.id);
      
      // Delete old profile picture if exists
      if (currentUser?.profilePicture) {
        const oldFilename = extractFilenameFromUrl(currentUser.profilePicture);
        if (oldFilename) {
          deleteProfilePicture(oldFilename);
        }
      }

      // Update user with new profile picture
      const updatedUser = await UserRepository.updateProfile(req.user.id, {
        profilePicture: req.file.filename,
      });

      // Broadcast profile update to connected clients
      const profileData = {
        ...updatedUser,
        profilePicture: getProfilePictureUrl(updatedUser.profilePicture),
      };

      SocketHelpers.broadcastToUser(req.user.id, 'user_profile_updated', {
        userId: req.user.id,
        profile: profileData,
      });

      res.status(200).json({
        success: true,
        data: profileData,
        message: 'Profile picture updated successfully',
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture',
      });
    }
  }

  // Status update validation
  static updateStatusValidation = [
    body('status')
      .isIn(['ONLINE', 'AWAY', 'OFFLINE'])
      .withMessage('Status must be ONLINE, AWAY, or OFFLINE'),
  ];

  // Update user status
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { status } = req.body;

      // Update user status in database
      const updatedUser = await UserRepository.updateStatus(req.user.id, status);

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

      // Broadcast status change to all relevant users
      await SocketHelpers.broadcastUserStatusChange(req.user.id, status);

      res.status(200).json({
        success: true,
        data: {
          ...updatedUser,
          profilePicture: getProfilePictureUrl(updatedUser.profilePicture),
        },
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

  // Search users
  static async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { q: query } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      if (query.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
        return;
      }

      const users = await UserRepository.searchUsers(query.trim(), req.user.id, 10);

      // Add profile picture URLs
      const usersWithPictures = users.map(user => ({
        ...user,
        profilePicture: getProfilePictureUrl(user.profilePicture),
      }));

      res.status(200).json({
        success: true,
        data: usersWithPictures,
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users',
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

  // Settings validation
  static updateSettingsValidation = [
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'system'])
      .withMessage('Theme must be light, dark, or system'),
    body('notifications')
      .optional()
      .isBoolean()
      .withMessage('Notifications must be a boolean'),
    body('soundEnabled')
      .optional()
      .isBoolean()
      .withMessage('Sound enabled must be a boolean'),
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be a boolean'),
    body('showOnlineStatus')
      .optional()
      .isBoolean()
      .withMessage('Show online status must be a boolean'),
  ];

  // Get user settings
  static async getUserSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const settings = await UserSettingsRepository.getOrCreateUserSettings(req.user.id);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('Get user settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user settings',
      });
    }
  }

  // Update user settings
  static async updateUserSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { theme, notifications, soundEnabled, emailNotifications, showOnlineStatus } = req.body;

      const updateData: any = {};
      if (theme !== undefined) updateData.theme = theme;
      if (notifications !== undefined) updateData.notifications = notifications;
      if (soundEnabled !== undefined) updateData.soundEnabled = soundEnabled;
      if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
      if (showOnlineStatus !== undefined) updateData.showOnlineStatus = showOnlineStatus;

      const updatedSettings = await UserSettingsRepository.updateUserSettings(req.user.id, updateData);

      // Broadcast settings change to user's connected clients
      SocketHelpers.broadcastToUser(req.user.id, 'user_settings_changed', {
        userId: req.user.id,
        settings: updatedSettings,
      });

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      console.error('Update user settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
      });
    }
  }

  // Password change validation
  static changePasswordValidation = [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  ];

  // Change user password
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { currentPassword, newPassword } = req.body;

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        res.status(400).json({
          success: false,
          error: 'New password must be different from current password',
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }
  }
}