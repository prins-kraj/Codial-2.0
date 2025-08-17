import { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateRoomRequest, ApiResponse, MessageHistoryQuery, RoomWithUsers } from '../types';
import { NotFoundError, ConflictError, AuthorizationError } from '../middleware/errorHandler';

export class RoomController {
  // Room creation validation
  static createRoomValidation = [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Room name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-_#]+$/)
      .withMessage('Room name can only contain letters, numbers, spaces, hyphens, underscores, and #'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be no more than 200 characters'),
    body('isPrivate')
      .optional()
      .isBoolean()
      .withMessage('isPrivate must be a boolean'),
  ];

  // Get all available rooms
  static async getRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rooms = await prisma.room.findMany({
        where: {
          OR: [
            { isPrivate: false },
            {
              isPrivate: true,
              userRooms: {
                some: {
                  userId: req.user.id,
                },
              },
            },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          userRooms: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
              userRooms: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const roomsWithStats = rooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        creator: room.creator,
        memberCount: room._count.userRooms,
        messageCount: room._count.messages,
        members: room.userRooms.map(ur => ur.user),
        isJoined: room.userRooms.some(ur => ur.userId === req.user.id),
      }));

      res.status(200).json({
        success: true,
        data: roomsWithStats,
      });
    } catch (error) {
      console.error('Get rooms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rooms',
      });
    }
  }

  // Get specific room details
  static async getRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          userRooms: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
            orderBy: {
              joinedAt: 'asc',
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      if (!room) {
        throw new NotFoundError('Room not found');
      }

      // Check if user has access to private room
      if (room.isPrivate && !room.userRooms.some(ur => ur.userId === req.user.id)) {
        throw new AuthorizationError('Access denied to private room');
      }

      const roomWithStats = {
        id: room.id,
        name: room.name,
        description: room.description,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        creator: room.creator,
        messageCount: room._count.messages,
        members: room.userRooms.map(ur => ({
          ...ur.user,
          joinedAt: ur.joinedAt,
          lastReadAt: ur.lastReadAt,
        })),
        isJoined: room.userRooms.some(ur => ur.userId === req.user.id),
      };

      res.status(200).json({
        success: true,
        data: roomWithStats,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      
      console.error('Get room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch room',
      });
    }
  }

  // Create new room
  static async createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { name, description, isPrivate = false }: CreateRoomRequest = req.body;

      // Check if room with same name already exists
      const existingRoom = await prisma.room.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      });

      if (existingRoom) {
        throw new ConflictError('Room with this name already exists');
      }

      // Create room
      const room = await prisma.room.create({
        data: {
          name,
          description,
          isPrivate,
          createdBy: req.user.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Automatically join creator to the room
      await prisma.userRoom.create({
        data: {
          userId: req.user.id,
          roomId: room.id,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...room,
          memberCount: 1,
          messageCount: 0,
          members: [{
            id: req.user.id,
            username: req.user.username,
            status: 'ONLINE',
            joinedAt: new Date(),
          }],
          isJoined: true,
        },
        message: 'Room created successfully',
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Create room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create room',
      });
    }
  }

  // Join room
  static async joinRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      // Check if room exists
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          userRooms: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!room) {
        throw new NotFoundError('Room not found');
      }

      // Check if user is already in the room
      if (room.userRooms.length > 0) {
        res.status(200).json({
          success: true,
          message: 'Already joined to room',
        });
        return;
      }

      // Join room
      await prisma.userRoom.create({
        data: {
          userId: req.user.id,
          roomId: roomId,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Successfully joined room',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Join room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join room',
      });
    }
  }

  // Leave room
  static async leaveRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      // Check if room exists and user is in it
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
        throw new NotFoundError('Room not found or not joined');
      }

      // Don't allow room creator to leave if there are other members
      if (userRoom.room.createdBy === req.user.id) {
        const memberCount = await prisma.userRoom.count({
          where: { roomId: roomId },
        });

        if (memberCount > 1) {
          res.status(400).json({
            success: false,
            error: 'Room creator cannot leave while other members are present',
          });
          return;
        }
      }

      // Leave room
      await prisma.userRoom.delete({
        where: {
          userId_roomId: {
            userId: req.user.id,
            roomId: roomId,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Successfully left room',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Leave room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave room',
      });
    }
  }

  // Get room message history
  static async getRoomMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50, before } = req.query as any;

      // Check if user has access to room
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

      if (!userRoom && userRoom?.room.isPrivate) {
        throw new AuthorizationError('Access denied to room messages');
      }

      // Build query conditions
      const whereConditions: any = {
        roomId: roomId,
      };

      if (before) {
        whereConditions.createdAt = {
          lt: new Date(before),
        };
      }

      // Get messages with pagination
      const messages = await prisma.message.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.min(parseInt(limit), 100), // Max 100 messages per request
        skip: (parseInt(page) - 1) * parseInt(limit),
      });

      // Update last read timestamp
      if (userRoom) {
        await prisma.userRoom.update({
          where: {
            userId_roomId: {
              userId: req.user.id,
              roomId: roomId,
            },
          },
          data: {
            lastReadAt: new Date(),
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          messages: messages.reverse(), // Return in chronological order
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

      console.error('Get room messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
      });
    }
  }

  // Get room members
  static async getRoomMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      // Check if room exists and user has access
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          userRooms: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!room) {
        throw new NotFoundError('Room not found');
      }

      if (room.isPrivate && room.userRooms.length === 0) {
        throw new AuthorizationError('Access denied to private room');
      }

      // Get room members
      const members = await prisma.userRoom.findMany({
        where: { roomId: roomId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              status: true,
              lastSeen: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      const membersWithDetails = members.map(member => ({
        ...member.user,
        joinedAt: member.joinedAt,
        lastReadAt: member.lastReadAt,
      }));

      res.status(200).json({
        success: true,
        data: membersWithDetails,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error('Get room members error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch room members',
      });
    }
  }
}