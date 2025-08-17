import { redis } from '../config/database';
import { UserStatus } from '@prisma/client';

// User presence management
export class UserPresenceManager {
  private static readonly USER_PRESENCE_PREFIX = 'user:presence:';
  private static readonly ROOM_USERS_PREFIX = 'room:users:';
  private static readonly USER_ROOMS_PREFIX = 'user:rooms:';

  // Set user online status
  static async setUserOnline(userId: string, socketId: string): Promise<void> {
    const key = `${this.USER_PRESENCE_PREFIX}${userId}`;
    await redis.hSet(key, {
      status: UserStatus.ONLINE,
      socketId,
      lastSeen: Date.now().toString(),
    });
    await redis.expire(key, 300); // 5 minutes TTL
  }

  // Set user offline
  static async setUserOffline(userId: string): Promise<void> {
    const key = `${this.USER_PRESENCE_PREFIX}${userId}`;
    await redis.hSet(key, {
      status: UserStatus.OFFLINE,
      lastSeen: Date.now().toString(),
    });
    await redis.expire(key, 86400); // 24 hours TTL for offline status
  }

  // Set user away
  static async setUserAway(userId: string): Promise<void> {
    const key = `${this.USER_PRESENCE_PREFIX}${userId}`;
    await redis.hSet(key, {
      status: UserStatus.AWAY,
      lastSeen: Date.now().toString(),
    });
  }

  // Get user status
  static async getUserStatus(userId: string): Promise<UserStatus | null> {
    const key = `${this.USER_PRESENCE_PREFIX}${userId}`;
    const status = await redis.hGet(key, 'status');
    return status as UserStatus | null;
  }

  // Get user socket ID
  static async getUserSocketId(userId: string): Promise<string | null> {
    const key = `${this.USER_PRESENCE_PREFIX}${userId}`;
    return await redis.hGet(key, 'socketId');
  }

  // Add user to room
  static async addUserToRoom(userId: string, roomId: string): Promise<void> {
    const roomKey = `${this.ROOM_USERS_PREFIX}${roomId}`;
    const userKey = `${this.USER_ROOMS_PREFIX}${userId}`;
    
    await Promise.all([
      redis.sAdd(roomKey, userId),
      redis.sAdd(userKey, roomId),
    ]);
  }

  // Remove user from room
  static async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    const roomKey = `${this.ROOM_USERS_PREFIX}${roomId}`;
    const userKey = `${this.USER_ROOMS_PREFIX}${userId}`;
    
    await Promise.all([
      redis.sRem(roomKey, userId),
      redis.sRem(userKey, roomId),
    ]);
  }

  // Get users in room
  static async getUsersInRoom(roomId: string): Promise<string[]> {
    const key = `${this.ROOM_USERS_PREFIX}${roomId}`;
    return await redis.sMembers(key);
  }

  // Get rooms for user
  static async getRoomsForUser(userId: string): Promise<string[]> {
    const key = `${this.USER_ROOMS_PREFIX}${userId}`;
    return await redis.sMembers(key);
  }

  // Remove user from all rooms (on disconnect)
  static async removeUserFromAllRooms(userId: string): Promise<void> {
    const userRooms = await this.getRoomsForUser(userId);
    const userKey = `${this.USER_ROOMS_PREFIX}${userId}`;
    
    // Remove user from all room sets
    const promises = userRooms.map(roomId => {
      const roomKey = `${this.ROOM_USERS_PREFIX}${roomId}`;
      return redis.sRem(roomKey, userId);
    });
    
    // Clear user's room set
    promises.push(redis.del(userKey));
    
    await Promise.all(promises);
  }

  // Get online users count in room
  static async getOnlineUsersCountInRoom(roomId: string): Promise<number> {
    const users = await this.getUsersInRoom(roomId);
    let onlineCount = 0;
    
    for (const userId of users) {
      const status = await this.getUserStatus(userId);
      if (status === UserStatus.ONLINE) {
        onlineCount++;
      }
    }
    
    return onlineCount;
  }
}

// Session management
export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:';

  // Store session data
  static async setSession(sessionId: string, data: Record<string, unknown>, ttl = 86400): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.setEx(key, ttl, JSON.stringify(data));
  }

  // Get session data
  static async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.del(key);
  }

  // Extend session TTL
  static async extendSession(sessionId: string, ttl = 86400): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.expire(key, ttl);
  }
}

// Typing indicators
export class TypingManager {
  private static readonly TYPING_PREFIX = 'typing:';

  // Set user typing in room
  static async setUserTyping(userId: string, roomId: string, ttl = 10): Promise<void> {
    const key = `${this.TYPING_PREFIX}${roomId}`;
    await redis.setEx(`${key}:${userId}`, ttl, '1');
  }

  // Remove user typing
  static async removeUserTyping(userId: string, roomId: string): Promise<void> {
    const key = `${this.TYPING_PREFIX}${roomId}:${userId}`;
    await redis.del(key);
  }

  // Get typing users in room
  static async getTypingUsers(roomId: string): Promise<string[]> {
    const pattern = `${this.TYPING_PREFIX}${roomId}:*`;
    const keys = await redis.keys(pattern);
    return keys.map(key => key.split(':').pop()!);
  }
}