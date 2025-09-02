import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';
import bcrypt from 'bcrypt';

// Mock the database
jest.mock('../config/database', () => ({
  prisma: {
    userSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock socket helpers
jest.mock('../utils/socketHelpers', () => ({
  SocketHelpers: {
    broadcastToUser: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('User Settings API', () => {
  let authToken: string;
  const mockUser = {
    id: 'user1',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockSettings = {
    id: 'settings1',
    userId: 'user1',
    theme: 'light',
    notifications: true,
    soundEnabled: true,
    emailNotifications: true,
    showOnlineStatus: true,
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

  describe('GET /api/users/me/settings', () => {
    it('should return existing user settings', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSettings);
    });

    it('should create default settings if none exist', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSettings);
      expect(mockPrisma.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          theme: 'light',
          notifications: true,
          soundEnabled: true,
          emailNotifications: true,
          showOnlineStatus: true,
        },
      });
    });
  });

  describe('PUT /api/users/me/settings', () => {
    it('should update settings successfully', async () => {
      const updateData = {
        theme: 'dark',
        notifications: false,
        soundEnabled: false,
      };

      const updatedSettings = { ...mockSettings, ...updateData };
      mockPrisma.userSettings.update.mockResolvedValue(updatedSettings);

      const response = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.notifications).toBe(false);
      expect(response.body.data.soundEnabled).toBe(false);
    });

    it('should validate theme values', async () => {
      const updateData = {
        theme: 'invalid-theme',
      };

      const response = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate boolean fields', async () => {
      const updateData = {
        notifications: 'not-a-boolean',
      };

      const response = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should create settings if they do not exist', async () => {
      const updateData = {
        theme: 'dark',
      };

      // Mock update to fail (settings don't exist)
      mockPrisma.userSettings.update.mockRejectedValue(new Error('Record not found'));
      
      // Mock create to succeed
      const newSettings = { ...mockSettings, theme: 'dark' };
      mockPrisma.userSettings.create.mockResolvedValue(newSettings);

      const response = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
    });
  });

  describe('PUT /api/users/me/password', () => {
    const mockUserWithPassword = {
      id: 'user1',
      passwordHash: 'hashedpassword',
    };

    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'NewPassword123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);
      mockBcrypt.compare
        .mockResolvedValueOnce(true)  // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      mockBcrypt.hash.mockResolvedValue('newhashed');
      mockPrisma.user.update.mockResolvedValue({} as any);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should reject same password', async () => {
      const passwordData = {
        currentPassword: 'samepassword',
        newPassword: 'samepassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);
      mockBcrypt.compare
        .mockResolvedValueOnce(true)  // Current password is correct
        .mockResolvedValueOnce(true); // New password is the same

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('New password must be different from current password');
    });

    it('should validate password strength', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'weak',
      };

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require current password', async () => {
      const passwordData = {
        newPassword: 'NewPassword123',
      };

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});