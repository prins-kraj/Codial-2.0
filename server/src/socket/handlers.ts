import { Socket } from 'socket.io';
import { prisma } from '../config/database';
import { UserPresenceManager, TypingManager } from '../utils/redis';
import { SocketData, SendMessageRequest } from '../types';

export class SocketHandlers {
  // Handle user joining a room
  static async handleJoinRoom(socket: Socket, roomId: string) {
    try {
      const socketData = socket.data as SocketData;
      
      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: socketData.userId,
            roomId: roomId,
          },
        },
        include: {
          room: true,
        },
      });

      if (!userRoom) {
        socket.emit('error', {
          message: 'Access denied to room',
          code: 'ROOM_ACCESS_DENIED',
        });
        return;
      }

      // Join the socket room
      await socket.join(roomId);
      
      // Update user presence in Redis
      await UserPresenceManager.addUserToRoom(socketData.userId, roomId);
      await UserPresenceManager.setUserOnline(socketData.userId, socket.id);

      // Notify other users in the room
      socket.to(roomId).emit('user_joined', {
        userId: socketData.userId,
        username: socketData.username,
        roomId: roomId,
      });

      console.log(`User ${socketData.username} joined room ${userRoom.room.name}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', {
        message: 'Failed to join room',
        code: 'JOIN_ROOM_ERROR',
      });
    }
  }

  // Handle user leaving a room
  static async handleLeaveRoom(socket: Socket, roomId: string) {
    try {
      const socketData = socket.data as SocketData;

      // Leave the socket room
      await socket.leave(roomId);
      
      // Update user presence in Redis
      await UserPresenceManager.removeUserFromRoom(socketData.userId, roomId);
      await TypingManager.removeUserTyping(socketData.userId, roomId);

      // Notify other users in the room
      socket.to(roomId).emit('user_left', {
        userId: socketData.userId,
        username: socketData.username,
        roomId: roomId,
      });

      console.log(`User ${socketData.username} left room ${roomId}`);
    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('error', {
        message: 'Failed to leave room',
        code: 'LEAVE_ROOM_ERROR',
      });
    }
  }

  // Handle sending a message
  static async handleSendMessage(socket: Socket, data: SendMessageRequest) {
    try {
      const socketData = socket.data as SocketData;
      const { content, roomId } = data;

      // Import validation utility
      const { MessageValidation } = await import('../utils/messageValidation');

      // Validate message
      const validation = await MessageValidation.validateMessage(content, socketData.userId, roomId);
      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error,
          code: 'MESSAGE_VALIDATION_ERROR',
        });
        return;
      }

      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: socketData.userId,
            roomId: roomId,
          },
        },
      });

      if (!userRoom) {
        socket.emit('error', {
          message: 'Access denied to room',
          code: 'ROOM_ACCESS_DENIED',
        });
        return;
      }

      // Save message to database with sanitized content
      const message = await prisma.message.create({
        data: {
          content: validation.sanitizedContent!,
          userId: socketData.userId,
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

      // Remove typing indicator
      await TypingManager.removeUserTyping(socketData.userId, roomId);

      // Broadcast message to all users in the room
      socket.to(roomId).emit('message_received', message);
      socket.emit('message_received', message); // Send to sender as confirmation

      console.log(`Message sent by ${socketData.username} in room ${roomId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', {
        message: 'Failed to send message',
        code: 'SEND_MESSAGE_ERROR',
      });
    }
  }

  // Handle typing start
  static async handleTypingStart(socket: Socket, roomId: string) {
    try {
      const socketData = socket.data as SocketData;

      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: socketData.userId,
            roomId: roomId,
          },
        },
      });

      if (!userRoom) {
        return;
      }

      // Set typing indicator in Redis
      await TypingManager.setUserTyping(socketData.userId, roomId, 10); // 10 seconds TTL

      // Notify other users in the room
      socket.to(roomId).emit('typing_indicator', {
        userId: socketData.userId,
        username: socketData.username,
        roomId: roomId,
        isTyping: true,
      });
    } catch (error) {
      console.error('Typing start error:', error);
    }
  }

  // Handle typing stop
  static async handleTypingStop(socket: Socket, roomId: string) {
    try {
      const socketData = socket.data as SocketData;

      // Remove typing indicator from Redis
      await TypingManager.removeUserTyping(socketData.userId, roomId);

      // Notify other users in the room
      socket.to(roomId).emit('typing_indicator', {
        userId: socketData.userId,
        username: socketData.username,
        roomId: roomId,
        isTyping: false,
      });
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  }

  // Handle user disconnect
  static async handleDisconnect(socket: Socket, reason: string) {
    try {
      const socketData = socket.data as SocketData;
      
      if (!socketData) {
        return;
      }

      console.log(`User ${socketData.username} disconnected: ${reason}`);

      // Update user status to offline
      await prisma.user.update({
        where: { id: socketData.userId },
        data: {
          status: 'OFFLINE',
          lastSeen: new Date(),
        },
      });

      // Update presence in Redis
      await UserPresenceManager.setUserOffline(socketData.userId);
      
      // Get all rooms user was in
      const userRooms = await UserPresenceManager.getRoomsForUser(socketData.userId);
      
      // Remove user from all rooms and notify other users
      for (const roomId of userRooms) {
        socket.to(roomId).emit('user_status_changed', {
          userId: socketData.userId,
          status: 'OFFLINE',
        });

        // Remove typing indicators
        await TypingManager.removeUserTyping(socketData.userId, roomId);
      }

      // Clean up user presence data
      await UserPresenceManager.removeUserFromAllRooms(socketData.userId);
    } catch (error) {
      console.error('Disconnect handler error:', error);
    }
  }

  // Handle connection error
  static handleConnectError(socket: Socket, error: Error) {
    console.error('Socket connection error:', error.message);
    socket.emit('error', {
      message: 'Connection failed',
      code: 'CONNECTION_ERROR',
    });
  }
}