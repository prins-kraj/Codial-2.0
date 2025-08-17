import request from 'supertest';
import { app } from '../app';
import { AuthUtils } from '../utils/auth';

// Mock dependencies
jest.mock('../config/database', () => ({
  prisma: {
    message: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userRoom: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    room: {
      update: jest.fn(),
    },
  },
  redis: {
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

jest.mock('../utils/socketHelpers', () => ({
  SocketHelpers: {
    broadcastToRoom: jest.fn(),
    setIO: jest.fn(),
  },
}));

const mockPrisma = require('../config/database').prisma;

describe('Message Controller', () => {
  let authToken: string;
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    authToken = AuthUtils.generateToken({
      userId: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
    });
    jest.clearAllMocks();
  });

  describe('POST /api/messages', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        content: 'Hello world!',
        roomId: 'room-1',
      };

      const mockMessage = {
        id: 'msg-1',
        content: messageData.content,
        userId: mockUser.id,
        roomId: messageData.roomId,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
        user: {
          id: mockUser.id,
          username: mockUser.username,
        },
      };

      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: messageData.roomId,
        room: { id: messageData.roomId, name: 'Test Room' },
      });
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.room.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(messageData.content);
      expect(response.body.message).toBe('Message sent successfully');
    });

    it('should validate message content', async () => {
      const invalidMessage = {
        content: '', // Empty content
        roomId: 'room-1',
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should check room access', async () => {
      const messageData = {
        content: 'Hello world!',
        roomId: 'private-room',
      };

      mockPrisma.userRoom.findUnique.mockResolvedValue(null); // No access

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied to room');
    });

    it('should enforce rate limiting', async () => {
      const messageData = {
        content: 'Spam message',
        roomId: 'room-1',
      };

      // Make multiple requests quickly
      const requests = Array(6)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${authToken}`)
            .send(messageData)
        );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/messages/:messageId', () => {
    it('should edit message successfully', async () => {
      const messageId = 'msg-1';
      const newContent = 'Updated message content';

      const mockMessage = {
        id: messageId,
        content: 'Original content',
        userId: mockUser.id,
        roomId: 'room-1',
        createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        user: {
          id: mockUser.id,
          username: mockUser.username,
        },
      };

      const mockUpdatedMessage = {
        ...mockMessage,
        content: newContent,
        editedAt: new Date(),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue(mockUpdatedMessage);

      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: newContent })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(newContent);
      expect(response.body.message).toBe('Message updated successfully');
    });

    it('should prevent editing other users messages', async () => {
      const messageId = 'msg-1';
      const newContent = 'Updated content';

      const mockMessage = {
        id: messageId,
        content: 'Original content',
        userId: 'other-user', // Different user
        roomId: 'room-1',
        createdAt: new Date(),
        user: {
          id: 'other-user',
          username: 'otheruser',
        },
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: newContent })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only edit your own messages');
    });

    it('should prevent editing old messages', async () => {
      const messageId = 'msg-1';
      const newContent = 'Updated content';

      const mockMessage = {
        id: messageId,
        content: 'Original content',
        userId: mockUser.id,
        roomId: 'room-1',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        user: {
          id: mockUser.id,
          username: mockUser.username,
        },
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: newContent })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe(
        'Message is too old to edit (max 24 hours)'
      );
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    it('should delete message successfully', async () => {
      const messageId = 'msg-1';

      const mockMessage = {
        id: messageId,
        content: 'Message to delete',
        userId: mockUser.id,
        roomId: 'room-1',
        createdAt: new Date(),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.delete.mockResolvedValue(mockMessage);

      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message deleted successfully');
    });

    it('should prevent deleting other users messages', async () => {
      const messageId = 'msg-1';

      const mockMessage = {
        id: messageId,
        content: 'Message to delete',
        userId: 'other-user', // Different user
        roomId: 'room-1',
        createdAt: new Date(),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only delete your own messages');
    });
  });

  describe('GET /api/messages/search', () => {
    it('should search messages successfully', async () => {
      const searchQuery = 'hello';
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello world!',
          userId: mockUser.id,
          roomId: 'room-1',
          createdAt: new Date(),
          user: {
            id: mockUser.id,
            username: mockUser.username,
          },
          room: {
            id: 'room-1',
            name: 'General',
          },
        },
      ];

      mockPrisma.userRoom.findMany.mockResolvedValue([{ roomId: 'room-1' }]);
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get(`/api/messages/search?query=${searchQuery}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.messages[0].content).toContain('Hello');
    });

    it('should validate search query length', async () => {
      const response = await request(app)
        .get('/api/messages/search?query=a') // Too short
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe(
        'Search query must be at least 2 characters long'
      );
    });
  });
});
