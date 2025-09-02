import { Server as SocketIOServer } from 'socket.io';
import { UserPresenceManager } from './redis';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types';

type AllowedEvent =
  | 'error'
  | 'message_received'
  | 'message_edited'
  | 'message_deleted'
  | 'user_joined'
  | 'user_left'
  | 'typing_indicator'
  | 'user_status_changed'
  | 'user_profile_updated'
  | 'user_settings_changed'
  | 'room_created'
  | 'direct_message_sent'
  | 'direct_message_received'
  | 'direct_message_edited'
  | 'direct_message_deleted'
  | 'pong';

export class SocketHelpers {
  private static io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  static setIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.io = io;
  }

  // Broadcast user status change to all relevant rooms
  static async broadcastUserStatusChange(userId: string, status: 'ONLINE' | 'AWAY' | 'OFFLINE') {
    if (!this.io) return;

    try {
      // Get all rooms the user is in
      const userRooms = await UserPresenceManager.getRoomsForUser(userId);

      // Broadcast to each room
      for (const roomId of userRooms) {
        this.io.to(roomId).emit('user_status_changed', {
          userId,
          status,
        });
      }
    } catch (error) {
      console.error('Error broadcasting user status change:', error);
    }
  }

  // Send message to specific user
  static async sendToUser(userId: string, event: AllowedEvent, data: any) {
    if (!this.io) return;

    try {
      const socketId = await UserPresenceManager.getUserSocketId(userId);
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
    } catch (error) {
      console.error('Error sending message to user:', error);
    }
  }

  // Broadcast to all connected sockets of a user (multiple devices)
  static async broadcastToUser(userId: string, event: AllowedEvent, data: any) {
    if (!this.io) return;

    try {
      // Get all socket IDs for the user
      const sockets = await this.io.fetchSockets();
      const userSockets = sockets.filter(socket => socket.data.userId === userId);
      
      // Send to all user's sockets
      for (const socket of userSockets) {
        socket.emit(event, data);
      }
    } catch (error) {
      console.error('Error broadcasting to user:', error);
    }
  }

  // Broadcast to all users in a room
  static broadcastToRoom(roomId: string, event: AllowedEvent, data: any) {
    if (!this.io) return;

    this.io.to(roomId).emit(event, data);
  }

  // Get online users count in a room
  static async getOnlineUsersInRoom(roomId: string): Promise<number> {
    if (!this.io) return 0;

    try {
      const sockets = await this.io.in(roomId).fetchSockets();
      return sockets.length;
    } catch (error) {
      console.error('Error getting online users in room:', error);
      return 0;
    }
  }

  // Get all connected users
  static async getConnectedUsers(): Promise<SocketData[]> {
    if (!this.io) return [];

    try {
      const sockets = await this.io.fetchSockets();
      return sockets.map(socket => socket.data);
    } catch (error) {
      console.error('Error getting connected users:', error);
      return [];
    }
  }

  // Force disconnect user
  static async disconnectUser(userId: string, reason?: string) {
    if (!this.io) return;

    try {
      const socketId = await UserPresenceManager.getUserSocketId(userId);
      if (socketId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          console.log(`Force disconnected user ${userId}: ${reason || 'No reason provided'}`);
        }
      }
    } catch (error) {
      console.error('Error force disconnecting user:', error);
    }
  }

  // Send system message to room
  static sendSystemMessage(roomId: string, message: string) {
    if (!this.io) return;

    this.io.to(roomId).emit('message_received', {
      id: `system-${Date.now()}`,
      content: message,
      userId: 'system',
      roomId: roomId,
      createdAt: new Date(),
      updatedAt: new Date(),
      editedAt: null,
      isDeleted: false,
      editHistory: null,
      user: {                                               
        id: 'system',
        username: 'System',
      },
    });
  }

  // Get room statistics
  static async getRoomStats(roomId: string) {
    if (!this.io) return null;

    try {
      const sockets = await this.io.in(roomId).fetchSockets();
      const onlineUsers = sockets.map(socket => socket.data);
      
      return {
        onlineCount: onlineUsers.length,
        users: onlineUsers,
      };
    } catch (error) {
      console.error('Error getting room stats:', error);
      return null;
    }
  }
}