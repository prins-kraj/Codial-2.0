import { DirectMessageRepository } from '../repositories/DirectMessageRepository';

// Mock Prisma
jest.mock('../config/database', () => ({
  prisma: {
    directMessage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = require('../config/database').prisma;

describe('DirectMessageRepository', () => {
  let repository: DirectMessageRepository;

  const mockUser1 = {
    id: 'user-1',
    username: 'user1',
    profilePicture: 'avatar1.jpg',
  };

  const mockUser2 = {
    id: 'user-2',
    username: 'user2',
    profilePicture: 'avatar2.jpg',
  };

  const mockDirectMessage = {
    id: 'dm-1',
    content: 'Hello there!',
    senderId: mockUser1.id,
    receiverId: mockUser2.id,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    editedAt: null,
    isDeleted: false,
    sender: mockUser1,
    receiver: mockUser2,
  };

  beforeEach(() => {
    repository = new DirectMessageRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new direct message', async () => {
      const messageData = {
        content: 'Hello there!',
        senderId: mockUser1.id,
        receiverId: mockUser2.id,
      };

      mockPrisma.directMessage.create.mockResolvedValue(mockDirectMessage);

      const result = await repository.create(messageData);

      expect(mockPrisma.directMessage.create).toHaveBeenCalledWith({
        data: messageData,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });
      expect(result).toEqual(mockDirectMessage);
    });
  });

  describe('findById', () => {
    it('should find a direct message by ID', async () => {
      mockPrisma.directMessage.findUnique.mockResolvedValue(mockDirectMessage);

      const result = await repository.findById('dm-1');

      expect(mockPrisma.directMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'dm-1' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });
      expect(result).toEqual(mockDirectMessage);
    });

    it('should return null if message not found', async () => {
      mockPrisma.directMessage.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMessagesBetweenUsers', () => {
    it('should get messages between two users', async () => {
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      const result = await repository.getMessagesBetweenUsers(
        mockUser1.id,
        mockUser2.id
      );

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: mockUser1.id, receiverId: mockUser2.id },
            { senderId: mockUser2.id, receiverId: mockUser1.id },
          ],
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(messages);
    });

    it('should apply limit and offset options', async () => {
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      await repository.getMessagesBetweenUsers(mockUser1.id, mockUser2.id, {
        limit: 20,
        offset: 10,
      });

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });

    it('should filter messages before a specific date', async () => {
      const beforeDate = new Date('2024-01-01T12:00:00Z');
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      await repository.getMessagesBetweenUsers(mockUser1.id, mockUser2.id, {
        before: beforeDate,
      });

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: beforeDate },
          }),
        })
      );
    });
  });

  describe('getUserConversations', () => {
    it('should get user conversations with correct grouping', async () => {
      const messages = [
        {
          ...mockDirectMessage,
          sender: { ...mockUser1, status: 'ONLINE' },
          receiver: { ...mockUser2, status: 'OFFLINE' },
        },
        {
          id: 'dm-2',
          content: 'Hi back!',
          senderId: mockUser2.id,
          receiverId: mockUser1.id,
          createdAt: new Date('2024-01-01T10:05:00Z'),
          sender: { ...mockUser2, status: 'OFFLINE' },
          receiver: { ...mockUser1, status: 'ONLINE' },
        },
      ];

      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      const result = await repository.getUserConversations(mockUser1.id);

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: mockUser1.id }, { receiverId: mockUser1.id }],
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
              status: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1); // Should group messages by partner
      expect(result[0].participantId).toBe(mockUser2.id);
      expect(result[0].participant.username).toBe(mockUser2.username);
      expect(result[0].unreadCount).toBe(1); // One message received from user2
    });
  });

  describe('update', () => {
    it('should update a direct message', async () => {
      const updateData = {
        content: 'Updated message',
        editedAt: new Date(),
      };

      const updatedMessage = {
        ...mockDirectMessage,
        ...updateData,
      };

      mockPrisma.directMessage.update.mockResolvedValue(updatedMessage);

      const result = await repository.update('dm-1', updateData);

      expect(mockPrisma.directMessage.update).toHaveBeenCalledWith({
        where: { id: 'dm-1' },
        data: updateData,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });
      expect(result).toEqual(updatedMessage);
    });
  });

  describe('delete', () => {
    it('should soft delete a direct message', async () => {
      const deletedMessage = {
        ...mockDirectMessage,
        isDeleted: true,
      };

      mockPrisma.directMessage.update.mockResolvedValue(deletedMessage);

      const result = await repository.delete('dm-1');

      expect(mockPrisma.directMessage.update).toHaveBeenCalledWith({
        where: { id: 'dm-1' },
        data: { isDeleted: true },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });
      expect(result).toEqual(deletedMessage);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a direct message', async () => {
      mockPrisma.directMessage.delete.mockResolvedValue(mockDirectMessage);

      await repository.hardDelete('dm-1');

      expect(mockPrisma.directMessage.delete).toHaveBeenCalledWith({
        where: { id: 'dm-1' },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread message count', async () => {
      mockPrisma.directMessage.count.mockResolvedValue(5);

      const result = await repository.getUnreadCount(mockUser1.id, mockUser2.id);

      expect(mockPrisma.directMessage.count).toHaveBeenCalledWith({
        where: {
          senderId: mockUser2.id,
          receiverId: mockUser1.id,
          isDeleted: false,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('searchMessages', () => {
    it('should search messages for a user', async () => {
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      const result = await repository.searchMessages(mockUser1.id, 'hello');

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: mockUser1.id }, { receiverId: mockUser1.id }],
          content: {
            contains: 'hello',
            mode: 'insensitive',
          },
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual(messages);
    });

    it('should search messages with specific partner', async () => {
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      await repository.searchMessages(mockUser1.id, 'hello', {
        partnerId: mockUser2.id,
      });

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { senderId: mockUser1.id, receiverId: mockUser2.id },
              { senderId: mockUser2.id, receiverId: mockUser1.id },
            ],
          }),
        })
      );
    });

    it('should apply limit and offset for search', async () => {
      const messages = [mockDirectMessage];
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      await repository.searchMessages(mockUser1.id, 'hello', {
        limit: 10,
        offset: 5,
      });

      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read (placeholder)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await repository.markAsRead(mockUser1.id, mockUser2.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Marking messages as read for user ${mockUser1.id} from ${mockUser2.id}`
      );

      consoleSpy.mockRestore();
    });
  });
});