import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DirectMessagesProvider } from '../../contexts/DirectMessagesContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { UserProfileProvider } from '../../contexts/UserProfileContext';
import DirectMessagesList from '../../components/chat/DirectMessagesList';
import DirectMessageChat from '../../components/chat/DirectMessageChat';
import UserSearch from '../../components/chat/UserSearch';
import * as api from '../../utils/api';

// Mock API calls
vi.mock('../../utils/api');
const mockApi = vi.mocked(api);

// Mock socket
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

vi.mock('../../utils/socket', () => ({
  getSocket: () => mockSocket,
}));

const mockUser = {
  id: 'user1',
  username: 'testuser1',
  email: 'test1@example.com',
  status: 'online' as const,
};

const mockOtherUser = {
  id: 'user2',
  username: 'testuser2',
  email: 'test2@example.com',
  status: 'online' as const,
};

const mockConversations = [
  {
    participantId: 'user2',
    participant: mockOtherUser,
    lastMessage: {
      id: 'msg1',
      content: 'Hello there!',
      senderId: 'user2',
      receiverId: 'user1',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      isDeleted: false,
      sender: mockOtherUser,
      receiver: mockUser,
    },
    unreadCount: 1,
    lastActivity: '2024-01-01T10:00:00Z',
  },
];

const mockMessages = [
  {
    id: 'msg1',
    content: 'Hello there!',
    senderId: 'user2',
    receiverId: 'user1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isDeleted: false,
    sender: mockOtherUser,
    receiver: mockUser,
  },
  {
    id: 'msg2',
    content: 'How are you?',
    senderId: 'user1',
    receiverId: 'user2',
    createdAt: '2024-01-01T10:01:00Z',
    updatedAt: '2024-01-01T10:01:00Z',
    isDeleted: false,
    sender: mockUser,
    receiver: mockOtherUser,
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <UserProfileProvider>
        <DirectMessagesProvider>
          {children}
        </DirectMessagesProvider>
      </UserProfileProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Direct Messaging Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth context
    vi.mocked(mockApi.getCurrentUser).mockResolvedValue(mockUser);
    
    // Setup default API responses
    mockApi.getDirectMessageConversations.mockResolvedValue(mockConversations);
    mockApi.getDirectMessages.mockResolvedValue({
      messages: mockMessages,
      participant: mockOtherUser,
    });
    mockApi.sendDirectMessage.mockResolvedValue(mockMessages[1]);
    mockApi.searchUsers.mockResolvedValue([mockOtherUser]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Direct Messaging Workflow', () => {
    test('should handle complete direct messaging flow from user search to conversation', async () => {
      const user = userEvent.setup();

      // 1. Render user search component
      render(
        <TestWrapper>
          <UserSearch onUserSelect={vi.fn()} />
        </TestWrapper>
      );

      // 2. Search for users
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'testuser2');

      await waitFor(() => {
        expect(mockApi.searchUsers).toHaveBeenCalledWith('testuser2');
      });

      // 3. Select user to start chat
      await waitFor(() => {
        expect(screen.getByText('testuser2')).toBeInTheDocument();
      });

      const userResult = screen.getByText('testuser2');
      await user.click(userResult);

      // 4. Render conversations list
      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getDirectMessageConversations).toHaveBeenCalled();
      });

      // 5. Verify conversation appears in list
      await waitFor(() => {
        expect(screen.getByText('testuser2')).toBeInTheDocument();
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Unread count
      });

      // 6. Click on conversation to open chat
      const conversation = screen.getByText('testuser2');
      await user.click(conversation);

      // 7. Render direct message chat
      render(
        <TestWrapper>
          <DirectMessageChat participantId="user2" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getDirectMessages).toHaveBeenCalledWith('user2');
      });

      // 8. Verify messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('How are you?')).toBeInTheDocument();
      });

      // 9. Send a new message
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Great, thanks!');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockApi.sendDirectMessage).toHaveBeenCalledWith({
          receiverId: 'user2',
          content: 'Great, thanks!',
        });
      });

      // 10. Verify socket event was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('direct_message_sent', {
        receiverId: 'user2',
        content: 'Great, thanks!',
      });
    });

    test('should handle real-time message receiving', async () => {
      const user = userEvent.setup();

      // Setup socket event handler
      let messageHandler: (message: any) => void;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'direct_message_received') {
          messageHandler = handler;
        }
      });

      render(
        <TestWrapper>
          <DirectMessageChat participantId="user2" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('direct_message_received', expect.any(Function));
      });

      // Simulate receiving a message
      const newMessage = {
        id: 'msg3',
        content: 'New real-time message',
        senderId: 'user2',
        receiverId: 'user1',
        createdAt: '2024-01-01T10:02:00Z',
        updatedAt: '2024-01-01T10:02:00Z',
        isDeleted: false,
        sender: mockOtherUser,
        receiver: mockUser,
      };

      messageHandler!(newMessage);

      await waitFor(() => {
        expect(screen.getByText('New real-time message')).toBeInTheDocument();
      });
    });

    test('should handle conversation switching', async () => {
      const user = userEvent.setup();

      // Mock multiple conversations
      const multipleConversations = [
        ...mockConversations,
        {
          participantId: 'user3',
          participant: {
            id: 'user3',
            username: 'testuser3',
            email: 'test3@example.com',
            status: 'online' as const,
          },
          lastMessage: {
            id: 'msg3',
            content: 'Another conversation',
            senderId: 'user3',
            receiverId: 'user1',
            createdAt: '2024-01-01T11:00:00Z',
            updatedAt: '2024-01-01T11:00:00Z',
            isDeleted: false,
            sender: {
              id: 'user3',
              username: 'testuser3',
              email: 'test3@example.com',
              status: 'online' as const,
            },
            receiver: mockUser,
          },
          unreadCount: 0,
          lastActivity: '2024-01-01T11:00:00Z',
        },
      ];

      mockApi.getDirectMessageConversations.mockResolvedValue(multipleConversations);

      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('testuser2')).toBeInTheDocument();
        expect(screen.getByText('testuser3')).toBeInTheDocument();
      });

      // Click on first conversation
      await user.click(screen.getByText('testuser2'));

      // Verify API call for first conversation
      await waitFor(() => {
        expect(mockApi.getDirectMessages).toHaveBeenCalledWith('user2');
      });

      // Click on second conversation
      await user.click(screen.getByText('testuser3'));

      // Verify API call for second conversation
      await waitFor(() => {
        expect(mockApi.getDirectMessages).toHaveBeenCalledWith('user3');
      });
    });

    test('should handle unread message indicators', async () => {
      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Unread count badge
      });

      // Simulate marking conversation as read
      const conversation = screen.getByText('testuser2');
      await userEvent.click(conversation);

      // Mock updated conversations with no unread messages
      const readConversations = [
        {
          ...mockConversations[0],
          unreadCount: 0,
        },
      ];

      mockApi.getDirectMessageConversations.mockResolvedValue(readConversations);

      // Re-render to show updated state
      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('1')).not.toBeInTheDocument();
      });
    });

    test('should handle message sending errors', async () => {
      const user = userEvent.setup();

      // Mock API error
      mockApi.sendDirectMessage.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <DirectMessageChat participantId="user2" />
        </TestWrapper>
      );

      const messageInput = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'This message will fail');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockApi.sendDirectMessage).toHaveBeenCalled();
      });

      // Should show error message or retry option
      await waitFor(() => {
        expect(screen.getByText(/failed to send/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle empty conversation state', async () => {
      // Mock empty conversations
      mockApi.getDirectMessageConversations.mockResolvedValue([]);

      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no conversations/i) || screen.getByText(/start a conversation/i)).toBeInTheDocument();
      });
    });

    test('should handle conversation loading states', async () => {
      // Mock delayed API response
      mockApi.getDirectMessageConversations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockConversations), 100))
      );

      render(
        <TestWrapper>
          <DirectMessagesList />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('testuser2')).toBeInTheDocument();
      });
    });
  });
});