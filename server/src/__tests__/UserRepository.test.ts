import { UserRepository } from '../repositories/UserRepository';
import { prisma } from '../config/database';
import { UserStatus } from '@prisma/client';

// Mock prisma
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Test bio',
        profilePicture: 'profile.jpg',
        status: UserStatus.ONLINE,
        createdAt: new Date(),
        lastSeen: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserRepository.getUserProfile('user1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
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
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserRepository.getUserProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        username: 'newusername',
        bio: 'New bio',
      };

      const mockUpdatedUser = {
        id: 'user1',
        username: 'newusername',
        email: 'test@example.com',
        bio: 'New bio',
        profilePicture: null,
        status: UserStatus.ONLINE,
        createdAt: new Date(),
        lastSeen: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await UserRepository.updateProfile('user1', updateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
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
    });
  });

  describe('updateStatus', () => {
    it('should update user status successfully', async () => {
      const mockUpdatedUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        bio: null,
        profilePicture: null,
        status: UserStatus.AWAY,
        createdAt: new Date(),
        lastSeen: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await UserRepository.updateStatus('user1', UserStatus.AWAY);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          status: UserStatus.AWAY,
          lastSeen: expect.any(Date),
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
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true when username is available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserRepository.isUsernameAvailable('newusername');

      expect(result).toBe(true);
    });

    it('should return false when username is taken by another user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'otheruser' });

      const result = await UserRepository.isUsernameAvailable('takenusername', 'user1');

      expect(result).toBe(false);
    });

    it('should return true when username is taken by the same user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1' });

      const result = await UserRepository.isUsernameAvailable('username', 'user1');

      expect(result).toBe(true);
    });
  });

  describe('searchUsers', () => {
    it('should search users by username', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'testuser1',
          email: 'test1@example.com',
          bio: null,
          profilePicture: null,
          status: UserStatus.ONLINE,
          createdAt: new Date(),
          lastSeen: new Date(),
        },
        {
          id: 'user2',
          username: 'testuser2',
          email: 'test2@example.com',
          bio: null,
          profilePicture: null,
          status: UserStatus.OFFLINE,
          createdAt: new Date(),
          lastSeen: new Date(),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await UserRepository.searchUsers('test', 'currentuser', 5);

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            contains: 'test',
            mode: 'insensitive',
          },
          id: { not: 'currentuser' },
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
        take: 5,
        orderBy: {
          username: 'asc',
        },
      });
    });
  });
});