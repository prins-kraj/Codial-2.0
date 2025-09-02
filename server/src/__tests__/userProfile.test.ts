import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';

// Mock the database
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Redis utilities
jest.mock('../utils/redis', () => ({
  UserPresenceManager: {
    setUserOnline: jest.fn(),
    setUserAway: jest.fn(),
    setUserOffline: jest.fn(),
  },
}));

// Mock socket helpers
jest.mock('../utils/socketHelpers', () => ({
  SocketHelpers: {
    broadcastToUser: jest.fn(),
    broadcastUserStatusChange: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('User Profile API', () => {
  let authToken: string;
  const mockUser = {
    id: 'user1',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio',
    profilePicture: null,
    status: 'ONLINE',
    createdAt: new Date(),
    lastSeen: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a valid JWT token for testing
    authToken = AuthUtils.generateToken({
      userId: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
    });
  });

  describe('GET /api/users/:userId/profile', () => {
    it('should return user profile successfully', async () => {
      // Mock additional stats query
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for UserRepository.getUserProfile
        .mockResolvedValueOnce({ // Second call for stats
          userRooms: [],
          _count: {
            messages: 5,
            createdRooms: 2,
          },
        });

      const response = await request(app)
        .get(`/api/users/${mockUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockUser.id);
      expect(response.body.data.username).toBe(mockUser.username);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/nonexistent/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/me/profile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        username: 'newusername',
        bio: 'New bio',
      };

      // Mock username availability check
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock profile update
      const updatedUser = { ...mockUser, ...updateData };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should return 409 when username is taken', async () => {
      const updateData = {
        username: 'takenusername',
      };

      // Mock username already taken
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'otheruser',
      });

      const response = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username already taken');
    });

    it('should validate bio length', async () => {
      const updateData = {
        bio: 'a'.repeat(501), // Too long
      };

      const response = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/users/me/status', () => {
    it('should update status successfully', async () => {
      const statusData = { status: 'AWAY' };
      
      const updatedUser = { ...mockUser, status: 'AWAY' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/me/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('AWAY');
    });

    it('should validate status value', async () => {
      const statusData = { status: 'INVALID' };

      const response = await request(app)
        .put('/api/users/me/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users successfully', async () => {
      const mockUsers = [
        {
          id: 'user2',
          username: 'testuser2',
          email: 'test2@example.com',
          bio: null,
          profilePicture: null,
          status: 'ONLINE',
          createdAt: new Date(),
          lastSeen: new Date(),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search?q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].username).toBe('testuser2');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search query is required');
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/users/search?q=a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search query must be at least 2 characters');
    });
  });
});