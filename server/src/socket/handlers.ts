import { Socket } from 'socket.io';
import { prisma } from '../config/database';
import { UserPresenceManager, TypingManager } from '../utils/redis';
import { SocketData, SendMessageRequest } from '../types';
import { MessageRepository } from '../repositories/MessageRepository';

export class SocketHandlers {
  private static messageRepository = new MessageRepository();

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

  // Handle editing a message
  static async handleEditMessage(socket: Socket, data: { messageId: string; content: string }) {
    try {
      const socketData = socket.data as SocketData;
      const { messageId, content } = data;

      // Validate input
      if (!messageId) {
        socket.emit('error', {
          message: 'Message ID is required',
          code: 'MISSING_MESSAGE_ID',
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        socket.emit('error', {
          message: 'Message content cannot be empty',
          code: 'INVALID_MESSAGE_CONTENT',
        });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', {
          message: 'Message too long (max 1000 characters)',
          code: 'MESSAGE_TOO_LONG',
        });
        return;
      }

      // Get the original message to verify room access
      const originalMessage = await SocketHandlers.messageRepository.findById(messageId);
      if (!originalMessage) {
        socket.emit('error', {
          message: 'Message not found',
          code: 'MESSAGE_NOT_FOUND',
        });
        return;
      }

      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: socketData.userId,
            roomId: originalMessage.roomId,
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

      // Import validation utility
      const { MessageValidation } = await import('../utils/messageValidation');

      // Validate message content
      const validation = await MessageValidation.validateMessage(content, socketData.userId, originalMessage.roomId);
      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error,
          code: 'MESSAGE_VALIDATION_ERROR',
        });
        return;
      }

      // Update the message using repository
      const updatedMessage = await SocketHandlers.messageRepository.updateMessage(
        messageId,
        validation.sanitizedContent!,
        socketData.userId
      );

      // Broadcast message edit to all users in the room
      socket.to(originalMessage.roomId).emit('message_edited', updatedMessage);
      socket.emit('message_edited', updatedMessage); // Send to sender as confirmation

      console.log(`Message ${messageId} edited by ${socketData.username} in room ${originalMessage.roomId}`);
    } catch (error) {
      console.error('Edit message error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          socket.emit('error', {
            message: error.message,
            code: 'MESSAGE_NOT_FOUND',
          });
          return;
        }
        
        if (error.message.includes('You can only edit') || error.message.includes('too old')) {
          socket.emit('error', {
            message: error.message,
            code: 'UNAUTHORIZED_MESSAGE_EDIT',
          });
          return;
        }
      }
      
      socket.emit('error', {
        message: 'Failed to edit message',
        code: 'EDIT_MESSAGE_ERROR',
      });
    }
  }

  // Handle deleting a message
  static async handleDeleteMessage(socket: Socket, data: { messageId: string }) {
    try {
      const socketData = socket.data as SocketData;
      const { messageId } = data;

      // Validate input
      if (!messageId) {
        socket.emit('error', {
          message: 'Message ID is required',
          code: 'MISSING_MESSAGE_ID',
        });
        return;
      }

      // Get the original message to verify room access
      const originalMessage = await SocketHandlers.messageRepository.findById(messageId);
      if (!originalMessage) {
        socket.emit('error', {
          message: 'Message not found',
          code: 'MESSAGE_NOT_FOUND',
        });
        return;
      }

      // Verify user has access to the room
      const userRoom = await prisma.userRoom.findUnique({
        where: {
          userId_roomId: {
            userId: socketData.userId,
            roomId: originalMessage.roomId,
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

      // Delete the message using repository
      await SocketHandlers.messageRepository.deleteMessage(messageId, socketData.userId);

      // Broadcast message deletion to all users in the room
      const deletionData = {
        messageId,
        roomId: originalMessage.roomId,
        senderId: originalMessage.userId,
      };

      socket.to(originalMessage.roomId).emit('message_deleted', deletionData);
      socket.emit('message_deleted', deletionData); // Send to sender as confirmation

      console.log(`Message ${messageId} deleted by ${socketData.username} in room ${originalMessage.roomId}`);
    } catch (error) {
      console.error('Delete message error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          socket.emit('error', {
            message: error.message,
            code: 'MESSAGE_NOT_FOUND',
          });
          return;
        }
        
        if (error.message.includes('You can only delete')) {
          socket.emit('error', {
            message: error.message,
            code: 'UNAUTHORIZED_MESSAGE_DELETE',
          });
          return;
        }
      }
      
      socket.emit('error', {
        message: 'Failed to delete message',
        code: 'DELETE_MESSAGE_ERROR',
      });
    }
  }

  // Handle user status updates
  static async handleUpdateUserStatus(socket: Socket, data: { status: string }) {
    try {
      const socketData = socket.data as SocketData;
      const { status } = data;

      // Validate status
      const validStatuses = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'];
      if (!validStatuses.includes(status)) {
        socket.emit('error', {
          message: 'Invalid status value',
          code: 'INVALID_STATUS',
        });
        return;
      }

      // Update user status in database
      const updatedUser = await prisma.user.update({
        where: { id: socketData.userId },
        data: {
          status: status as any,
          lastSeen: new Date(),
        },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      // Update presence in Redis
      if (status === 'OFFLINE') {
        await UserPresenceManager.setUserOffline(socketData.userId);
      } else {
        await UserPresenceManager.setUserOnline(socketData.userId, socket.id);
      }

      // Get all rooms user is in to broadcast status change
      const userRooms = await prisma.userRoom.findMany({
        where: { userId: socketData.userId },
        select: { roomId: true },
      });

      // Broadcast status change to all rooms the user is in
      for (const userRoom of userRooms) {
        socket.to(userRoom.roomId).emit('user_status_changed', {
          userId: socketData.userId,
          status: updatedUser.status,
        });
      }

      // Send confirmation to the user
      socket.emit('user_status_changed', {
        userId: socketData.userId,
        status: updatedUser.status,
      });

      console.log(`User ${socketData.username} status updated to ${status}`);
    } catch (error) {
      console.error('Update user status error:', error);
      socket.emit('error', {
        message: 'Failed to update status',
        code: 'UPDATE_STATUS_ERROR',
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

  // Handle user profile updates
  static async handleUserProfileUpdated(socket: Socket, data: any) {
    try {
      const socketData = socket.data as SocketData;

      // Get all rooms user is in to broadcast profile change
      const userRooms = await prisma.userRoom.findMany({
        where: { userId: socketData.userId },
        select: { roomId: true },
      });

      // Broadcast profile update to all rooms the user is in
      for (const userRoom of userRooms) {
        socket.to(userRoom.roomId).emit('user_profile_updated', {
          userId: socketData.userId,
          profile: data,
        });
      }

      console.log(`User ${socketData.username} profile updated`);
    } catch (error) {
      console.error('User profile update broadcast error:', error);
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