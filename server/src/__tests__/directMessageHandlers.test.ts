import { DirectMessageHandlers } from '../socket/directMessageHandlers';
import { Socket } from 'socket.io';

// Mock dependencies
jest.mock('../repositories/DirectMessageRepository');
jest.mock('../utils/socketHelpers', () => ({
  SocketHelpers: {
    sendToUser: jest.fn(),
  },
}));
jest.mock('../utils/messageValidation', () => ({
  MessageValidation: {
    validateMessage: jest.fn(),
  },
}));

const MockDirectMessageRepository = require('../repositories/DirectMessageRepository').DirectMessageRepository;
const mockSocketHelpers = require('../utils/socketHelpers').SocketHelpers;
const mockMessageValidation = require('../utils/messageValidation').MessageValidation;

describe('DirectMessageHandlers', () => {
  let mockSocket: Partial<Socket>;
  let mockRepository: jest.Mocked<InstanceType<typeof MockDirectMessageRepository>>;

  const mockUser = {
    userId: 'user-1',
    username: 'testuser',
  };

  const mockMessage = {
    id: 'dm-1',
    content: 'Hello there!',
    senderId: 'user-1',
    receiverId: 'user-2',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    editedAt: null,
    isDeleted: false,
    sender: {
      id: 'user-1',
      username: 'user1',
      profilePicture: null,
    },
    receiver: {
      id: 'user-2',
      username: 'user2',
      profilePicture: null,
    },
  };

  beforeEach(() => {
    mockSocket = {
      data: mockUser,
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockDirectMessageRepository.mockImplementation(() => mockRepository);

    jest.clearAllMocks();
  });

  describe('handleSendDirectMessage', () => {
    it('should send a direct message successfully', async () => {
      const messageData = {
        content: 'Hello there!',
        receiverId: 'user-2',
      };

      mockMessageValidation.validateMessage.mockResolvedValue({
        valid: true,
        sanitizedContent: 'Hello there!',
      });

      mockRepository.create.mockResolvedValue(mockMessage);

      await DirectMessageHandlers.handleSendDirectMessage(
        mockSocket as Socket,
        messageData
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        content: 'Hello there!',
        senderId: mockUser.userId,
        receiverId: 'user-2',
      });

      expect(mockSocketHelpers.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'direct_message_received',
        mockMessage
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'direct_message_sent',
        mockMessage
      );
    });

    it('should reject empty message content', async () => {
      const messageData = {
        content: '',
        receiverId: 'user-2',
      };

      await DirectMessageHandlers.handleSendDirectMessage(
        mockSocket as Socket,
        messageData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message content cannot be empty',
        code: 'INVALID_MESSAGE_CONTENT',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject messages that are too long', async () => {
      const messageData = {
        content: 'a'.repeat(1001), // Too long
        receiverId: 'user-2',
      };

      await DirectMessageHandlers.handleSendDirectMessage(
        mockSocket as Socket,
        messageData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message too long (max 1000 characters)',
        code: 'MESSAGE_TOO_LONG',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject self-messaging', async () => {
      const messageData = {
        content: 'Hello myself!',
        receiverId: mockUser.userId, // Same as sender
      };

      await DirectMessageHandlers.handleSendDirectMessage(
        mockSocket as Socket,
        messageData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Cannot send message to yourself',
        code: 'SELF_MESSAGE_NOT_ALLOWED',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const messageData = {
        content: 'Invalid message',
        receiverId: 'user-2',
      };

      mockMessageValidation.validateMessage.mockResolvedValue({
        valid: false,
        error: 'Message contains inappropriate content',
      });

      await DirectMessageHandlers.handleSendDirectMessage(
        mockSocket as Socket,
        messageData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message contains inappropriate content',
        code: 'MESSAGE_VALIDATION_ERROR',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('handleEditDirectMessage', () => {
    it('should edit a direct message successfully', async () => {
      const editData = {
        messageId: 'dm-1',
        content: 'Updated message',
      };

      const updatedMessage = {
        ...mockMessage,
        content: 'Updated message',
        editedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockMessage);
      mockMessageValidation.validateMessage.mockResolvedValue({
        valid: true,
        sanitizedContent: 'Updated message',
      });
      mockRepository.update.mockResolvedValue(updatedMessage);

      await DirectMessageHandlers.handleEditDirectMessage(
        mockSocket as Socket,
        editData
      );

      expect(mockRepository.findById).toHaveBeenCalledWith('dm-1');
      expect(mockRepository.update).toHaveBeenCalledWith('dm-1', {
        content: 'Updated message',
        editedAt: expect.any(Date),
      });

      expect(mockSocketHelpers.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'direct_message_edited',
        updatedMessage
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'direct_message_edited',
        updatedMessage
      );
    });

    it('should reject editing non-existent message', async () => {
      const editData = {
        messageId: 'non-existent',
        content: 'Updated message',
      };

      mockRepository.findById.mockResolvedValue(null);

      await DirectMessageHandlers.handleEditDirectMessage(
        mockSocket as Socket,
        editData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject editing other users messages', async () => {
      const editData = {
        messageId: 'dm-1',
        content: 'Updated message',
      };

      const otherUserMessage = {
        ...mockMessage,
        senderId: 'other-user',
      };

      mockRepository.findById.mockResolvedValue(otherUserMessage);

      await DirectMessageHandlers.handleEditDirectMessage(
        mockSocket as Socket,
        editData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You can only edit your own messages',
        code: 'UNAUTHORIZED_MESSAGE_EDIT',
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject editing old messages', async () => {
      const editData = {
        messageId: 'dm-1',
        content: 'Updated message',
      };

      const oldMessage = {
        ...mockMessage,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockRepository.findById.mockResolvedValue(oldMessage);

      await DirectMessageHandlers.handleEditDirectMessage(
        mockSocket as Socket,
        editData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message is too old to edit (max 24 hours)',
        code: 'MESSAGE_TOO_OLD',
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteDirectMessage', () => {
    it('should delete a direct message successfully', async () => {
      const deleteData = {
        messageId: 'dm-1',
      };

      mockRepository.findById.mockResolvedValue(mockMessage);
      mockRepository.delete.mockResolvedValue(mockMessage);

      await DirectMessageHandlers.handleDeleteDirectMessage(
        mockSocket as Socket,
        deleteData
      );

      expect(mockRepository.findById).toHaveBeenCalledWith('dm-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('dm-1');

      const expectedDeletionData = {
        messageId: 'dm-1',
        senderId: 'user-1',
        receiverId: 'user-2',
      };

      expect(mockSocketHelpers.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'direct_message_deleted',
        expectedDeletionData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'direct_message_deleted',
        expectedDeletionData
      );
    });

    it('should reject deleting non-existent message', async () => {
      const deleteData = {
        messageId: 'non-existent',
      };

      mockRepository.findById.mockResolvedValue(null);

      await DirectMessageHandlers.handleDeleteDirectMessage(
        mockSocket as Socket,
        deleteData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      });

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should reject deleting other users messages', async () => {
      const deleteData = {
        messageId: 'dm-1',
      };

      const otherUserMessage = {
        ...mockMessage,
        senderId: 'other-user',
      };

      mockRepository.findById.mockResolvedValue(otherUserMessage);

      await DirectMessageHandlers.handleDeleteDirectMessage(
        mockSocket as Socket,
        deleteData
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You can only delete your own messages',
        code: 'UNAUTHORIZED_MESSAGE_DELETE',
      });

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinDirectConversation', () => {
    it('should join a direct conversation successfully', async () => {
      const partnerId = 'user-2';

      await DirectMessageHandlers.handleJoinDirectConversation(
        mockSocket as Socket,
        partnerId
      );

      // Should join a room with consistent naming (sorted user IDs)
      const expectedRoom = 'user-1-user-2';
      expect(mockSocket.join).toHaveBeenCalledWith(expectedRoom);
    });

    it('should reject joining conversation with self', async () => {
      const partnerId = mockUser.userId;

      await DirectMessageHandlers.handleJoinDirectConversation(
        mockSocket as Socket,
        partnerId
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Cannot join conversation with yourself',
        code: 'SELF_CONVERSATION_NOT_ALLOWED',
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveDirectConversation', () => {
    it('should leave a direct conversation successfully', async () => {
      const partnerId = 'user-2';

      await DirectMessageHandlers.handleLeaveDirectConversation(
        mockSocket as Socket,
        partnerId
      );

      // Should leave the room with consistent naming (sorted user IDs)
      const expectedRoom = 'user-1-user-2';
      expect(mockSocket.leave).toHaveBeenCalledWith(expectedRoom);
    });

    it('should handle missing partner ID gracefully', async () => {
      await DirectMessageHandlers.handleLeaveDirectConversation(
        mockSocket as Socket,
        ''
      );

      // Should not throw error, just return early
      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });
});