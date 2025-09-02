import { MessageRepository } from '../repositories/MessageRepository';

// Mock Prisma
jest.mock('../config/database', () => ({
  prisma: {
    message: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = require('../config/database').prisma;

describe('MessageRepository', () => {
  let repository: MessageRepository;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
  };

  const mockRoom = {
    id: 'room-1',
    name: 'Test Room',
    isPrivate: false,
  };

  const mockMessage = {
    id: 'message-1',
    content: 'Test message',
    userId: 'user-1',
    roomId: 'room-1',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    editedAt: null,
    isDeleted: false,
    editHistory: null,
    user: mockUser,
  };

  beforeEach(() => {
    repository = new MessageRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const messageData = {
        content: 'Test message',
        userId: 'user-1',
        roomId: 'room-1',
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await repository.create(messageData);

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Test message',
          userId: 'user-1',
          roomId: 'room-1',
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
      expect(result).toEqual(mockMessage);
    });

    it('should trim message content', async () => {
      const messageData = {
        content: '  Test message  ',
        userId: 'user-1',
        roomId: 'room-1',
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      await repository.create(messageData);

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Test message',
          userId: 'user-1',
          roomId: 'room-1',
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
    });
  });

  describe('findById', () => {
    it('should find a message by ID', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      const result = await repository.findById('message-1');

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMessage);
    });

    it('should return null if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateMessage', () => {
    it('should update a message successfully', async () => {
      const updatedMessage = {
        ...mockMessage,
        content: 'Updated message',
        editedAt: new Date('2024-01-01T11:00:00Z'),
        editHistory: [
          {
            content: 'Test message',
            editedAt: '2024-01-01T10:00:00.000Z',
          },
        ],
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue(updatedMessage);

      const result = await repository.updateMessage('message-1', 'Updated message', 'user-1');

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: {
          content: 'Updated message',
          editedAt: expect.any(Date),
          editHistory: [
            {
              content: 'Test message',
              editedAt: '2024-01-01T10:00:00.000Z',
            },
          ],
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

      expect(result).toEqual(updatedMessage);
    });

    it('should throw error if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        repository.updateMessage('nonexistent', 'Updated message', 'user-1')
      ).rejects.toThrow('Message not found');
    });

    it('should throw error if user is not the owner', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      await expect(
        repository.updateMessage('message-1', 'Updated message', 'other-user')
      ).rejects.toThrow('You can only edit your own messages');
    });

    it('should throw error if message is too old to edit', async () => {
      const oldMessage = {
        ...mockMessage,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockPrisma.message.findUnique.mockResolvedValue(oldMessage);

      await expect(
        repository.updateMessage('message-1', 'Updated message', 'user-1')
      ).rejects.toThrow('Message is too old to edit (max 24 hours)');
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message successfully', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
        content: '[Message deleted]',
      });

      await repository.deleteMessage('message-1', 'user-1');

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-1' },
      });

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: {
          isDeleted: true,
          content: '[Message deleted]',
        },
      });
    });

    it('should throw error if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        repository.deleteMessage('nonexistent', 'user-1')
      ).rejects.toThrow('Message not found');
    });

    it('should throw error if user is not the owner', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      await expect(
        repository.deleteMessage('message-1', 'other-user')
      ).rejects.toThrow('You can only delete your own messages');
    });
  });

  describe('hardDeleteMessage', () => {
    it('should permanently delete a message successfully', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.delete.mockResolvedValue(mockMessage);

      await repository.hardDeleteMessage('message-1', 'user-1');

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-1' },
      });

      expect(mockPrisma.message.delete).toHaveBeenCalledWith({
        where: { id: 'message-1' },
      });
    });

    it('should throw error if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        repository.hardDeleteMessage('nonexistent', 'user-1')
      ).rejects.toThrow('Message not found');
    });

    it('should throw error if user is not the owner', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      await expect(
        repository.hardDeleteMessage('message-1', 'other-user')
      ).rejects.toThrow('You can only delete your own messages');
    });
  });

  describe('validateOwnership', () => {
    it('should return true if user owns the message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await repository.validateOwnership('message-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if user does not own the message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await repository.validateOwnership('message-1', 'other-user');

      expect(result).toBe(false);
    });

    it('should return false if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const result = await repository.validateOwnership('nonexistent', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('should return true if message can be edited', async () => {
      const recentMessage = {
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };

      mockPrisma.message.findUnique.mockResolvedValue(recentMessage);

      const result = await repository.canEdit('message-1');

      expect(result).toBe(true);
    });

    it('should return false if message is too old', async () => {
      const oldMessage = {
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockPrisma.message.findUnique.mockResolvedValue(oldMessage);

      const result = await repository.canEdit('message-1');

      expect(result).toBe(false);
    });

    it('should return false if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const result = await repository.canEdit('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('searchMessages', () => {
    it('should search messages with query', async () => {
      const mockMessages = [mockMessage];
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await repository.searchMessages({
        query: 'test',
        limit: 20,
        page: 1,
      });

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: {
          content: {
            contains: 'test',
            mode: 'insensitive',
          },
          isDeleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              isPrivate: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        skip: 0,
      });

      expect(result).toEqual(mockMessages);
    });
  });
});