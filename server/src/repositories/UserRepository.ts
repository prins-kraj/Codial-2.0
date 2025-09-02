import { prisma } from '../config/database';
import { User, UserStatus } from '@prisma/client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  status: UserStatus;
  createdAt: Date;
  lastSeen: Date;
}

export interface UpdateProfileData {
  username?: string;
  bio?: string;
  profilePicture?: string;
}

export class UserRepository {
  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    return user;
  }

  // Update user profile
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<UserProfile> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    return updatedUser;
  }

  // Update user status
  static async updateStatus(userId: string, status: UserStatus): Promise<UserProfile> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status,
        lastSeen: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    return updatedUser;
  }

  // Check if username is available (excluding current user)
  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existingUser) {
      return true;
    }

    return excludeUserId ? existingUser.id === excludeUserId : false;
  }

  // Get user by username
  static async getUserByUsername(username: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    return user;
  }

  // Search users by username (for starting conversations)
  static async searchUsers(query: string, excludeUserId?: string, limit: number = 10): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive',
        },
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        lastSeen: true,
      },
      take: limit,
      orderBy: {
        username: 'asc',
      },
    });

    return users;
  }
}