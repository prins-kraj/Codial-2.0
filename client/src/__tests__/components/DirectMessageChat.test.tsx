import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DirectMessageChat from '@/components/chat/DirectMessageChat';
import { DirectMessagesContext } from '@/contexts/DirectMessagesContext';
import { AuthContext } from '@/contexts/AuthContext';
import { DirectMessage, User, DirectConversation } from '@/types';

// Mock components
vi.mock('@/components/chat/UserAvatar', () => ({
  default: ({ user }: { user: User }) => <div data-testid="user-avatar">{user.username}</div>
}));

vi.mock('@/components/chat/UserStatusIndicator', () => ({
  default: ({ status }: { status: string }) => <div data-testid="status-indicator">{status}</div>
}));

vi.mock('@/components/chat/UserProfileComponent', () => ({
  default: ({ userId, isOpen, onClose }: { userId: string; isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="user-profile-modal" onClick={onClose}>Profile for {userId}</div> : null
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  default: ({ size }: { size?: string }) => <div data-testid="loading-spinner" data-size={size}>Loading...</div>
}));

vi.mock('@/utils/socket', () => ({
  socketManager: {
    joinDirectConversation: vi.fn(),
    leaveDirectConversation: vi.fn(),
    getSocket: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn()
    }))
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockUser: User = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
};

const mockParticipant: User = {
  id: 'user2',
  username: 'participant',
  email: 'participant@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
};

const mockMessage: DirectMessage = {
  id: 'msg1',
  content: 'Hello there!',
  senderId: 'user2',
  receiverId: 'user1',
  createdAt: '2023-01-01T12:00:00Z',
  updatedAt: '2023-01-01T12:00:00Z',
  isDeleted: false,
  sender: mockParticipant,
  receiver: mockUser
};

const mockConversation: DirectConversation = {
  participantId: 'user2',
  participant: mockParticipant,
  lastMessage: mockMessage,
  unreadCount: 0,
  lastActivity: '2023-01-01T12:00:00Z'
};

const mockDirectMessagesContext = {
  conversations: [mockConversation],
  activeConversation: 'user2',
  messages: { user2: [mockMessage] },
  unreadCounts: {},
  isLoading: false,
  error: null,
  setActiveConversation: vi.fn(),
  getUnreadCount: vi.fn(() => 0),
  loadConversations: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  clearError: vi.fn()
};

const mockAuthContext = {
  user: mockUser,
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn()
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <DirectMessagesContext.Provider value={mockDirectMessagesContext}>
        {component}
      </DirectMessagesContext.Provider>
    </AuthContext.Provider>
  );
};

describe('DirectMessageChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders participant not found when participant is missing', () => {
    const contextWithoutParticipant = {
      ...mockDirectMessagesContext,
      conversations: []
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={contextWithoutParticipant}>
          <DirectMessageChat participantId="nonexistent" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Participant not found')).toBeInTheDocument();
  });

  it('renders loading state when loading messages', () => {
    const loadingContext = {
      ...mockDirectMessagesContext,
      isLoading: true,
      messages: { user2: [] }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={loadingContext}>
          <DirectMessageChat participantId="user2" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    const emptyContext = {
      ...mockDirectMessagesContext,
      messages: { user2: [] }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={emptyContext}>
          <DirectMessageChat participantId="user2" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start the conversation with participant!')).toBeInTheDocument();
  });

  it('renders participant header with status', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    expect(screen.getByText('participant')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
  });

  it('renders messages', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('handles message input and submission', async () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const messageInput = screen.getByPlaceholderText('Message participant');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type message
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    expect(messageInput).toHaveValue('Test message');

    // Send message
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockDirectMessagesContext.sendMessage).toHaveBeenCalledWith('user2', 'Test message');
    });
  });

  it('handles Enter key to send message', async () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const messageInput = screen.getByPlaceholderText('Message participant');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.keyDown(messageInput, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockDirectMessagesContext.sendMessage).toHaveBeenCalledWith('user2', 'Test message');
    });
  });

  it('does not send message on Shift+Enter', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const messageInput = screen.getByPlaceholderText('Message participant');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.keyDown(messageInput, { key: 'Enter', shiftKey: true });

    expect(mockDirectMessagesContext.sendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when message is empty', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message has content', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const messageInput = screen.getByPlaceholderText('Message participant');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('opens user profile modal when clicking participant header', async () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const participantButton = screen.getByRole('button', { name: /participant/i });
    fireEvent.click(participantButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', () => {
    const mockOnBack = vi.fn();
    renderWithProviders(<DirectMessageChat participantId="user2" onBack={mockOnBack} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows character count when near limit', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    const messageInput = screen.getByPlaceholderText('Message participant');
    const longMessage = 'a'.repeat(950); // Near the 1000 character limit
    
    fireEvent.change(messageInput, { target: { value: longMessage } });

    expect(screen.getByText(/characters remaining/)).toBeInTheDocument();
  });

  it('shows error message when present', () => {
    const errorContext = {
      ...mockDirectMessagesContext,
      error: 'Failed to send message'
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={errorContext}>
          <DirectMessageChat participantId="user2" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  it('groups messages by date', () => {
    const messagesFromDifferentDays = [
      {
        ...mockMessage,
        id: 'msg1',
        createdAt: '2023-01-01T12:00:00Z',
        content: 'Message from yesterday'
      },
      {
        ...mockMessage,
        id: 'msg2',
        createdAt: '2023-01-02T12:00:00Z',
        content: 'Message from today'
      }
    ];

    const contextWithMultipleDays = {
      ...mockDirectMessagesContext,
      messages: { user2: messagesFromDifferentDays }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={contextWithMultipleDays}>
          <DirectMessageChat participantId="user2" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Message from yesterday')).toBeInTheDocument();
    expect(screen.getByText('Message from today')).toBeInTheDocument();
  });

  it('shows edited indicator for edited messages', () => {
    const editedMessage = {
      ...mockMessage,
      editedAt: '2023-01-01T12:30:00Z'
    };

    const contextWithEditedMessage = {
      ...mockDirectMessagesContext,
      messages: { user2: [editedMessage] }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={contextWithEditedMessage}>
          <DirectMessageChat participantId="user2" />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('calls setActiveConversation and loadMessages on mount', () => {
    renderWithProviders(<DirectMessageChat participantId="user2" />);

    expect(mockDirectMessagesContext.setActiveConversation).toHaveBeenCalledWith('user2');
    expect(mockDirectMessagesContext.loadMessages).toHaveBeenCalledWith('user2');
  });
});