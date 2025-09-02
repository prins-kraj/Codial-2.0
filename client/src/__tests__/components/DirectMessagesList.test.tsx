import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DirectMessagesList from '@/components/chat/DirectMessagesList';
import { DirectMessagesContext } from '@/contexts/DirectMessagesContext';
import { AuthContext } from '@/contexts/AuthContext';
import { DirectConversation, User, DirectMessage } from '@/types';

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ userId: 'user2' })
  };
});

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
  unreadCount: 2,
  lastActivity: '2023-01-01T12:00:00Z'
};

const mockDirectMessagesContext = {
  conversations: [mockConversation],
  activeConversation: null,
  messages: {},
  unreadCounts: { user2: 2 },
  isLoading: false,
  error: null,
  setActiveConversation: vi.fn(),
  getUnreadCount: vi.fn((id: string) => id === 'user2' ? 2 : 0),
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
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={mockDirectMessagesContext}>
          {component}
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('DirectMessagesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const loadingContext = { ...mockDirectMessagesContext, isLoading: true };
    
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <DirectMessagesContext.Provider value={loadingContext}>
            <DirectMessagesList />
          </DirectMessagesContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorContext = { ...mockDirectMessagesContext, error: 'Failed to load conversations' };
    
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <DirectMessagesContext.Provider value={errorContext}>
            <DirectMessagesList />
          </DirectMessagesContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
  });

  it('renders empty state when no conversations', () => {
    const emptyContext = { ...mockDirectMessagesContext, conversations: [] };
    
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <DirectMessagesContext.Provider value={emptyContext}>
            <DirectMessagesList />
          </DirectMessagesContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('No direct messages yet.')).toBeInTheDocument();
  });

  it('renders conversation list', () => {
    renderWithProviders(<DirectMessagesList />);

    expect(screen.getByText('participant')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // unread count
  });

  it('shows "You:" prefix for own messages', () => {
    const ownMessageConversation = {
      ...mockConversation,
      lastMessage: { ...mockMessage, senderId: 'user1' }
    };
    const contextWithOwnMessage = {
      ...mockDirectMessagesContext,
      conversations: [ownMessageConversation]
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <DirectMessagesContext.Provider value={contextWithOwnMessage}>
            <DirectMessagesList />
          </DirectMessagesContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/You: Hello there!/)).toBeInTheDocument();
  });

  it('handles conversation selection', async () => {
    const mockNavigate = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);

    renderWithProviders(<DirectMessagesList />);

    const conversationButton = screen.getByRole('button', { name: /participant/ });
    fireEvent.click(conversationButton);

    expect(mockDirectMessagesContext.setActiveConversation).toHaveBeenCalledWith('user2');
    expect(mockNavigate).toHaveBeenCalledWith('/chat/dm/user2');
  });

  it('opens user profile modal', async () => {
    renderWithProviders(<DirectMessagesList />);

    const menuButton = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(menuButton);

    const viewProfileButton = screen.getByText('View Profile');
    fireEvent.click(viewProfileButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
    });
  });

  it('closes user profile modal', async () => {
    renderWithProviders(<DirectMessagesList />);

    // Open modal
    const menuButton = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText('View Profile'));

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByTestId('user-profile-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
    });
  });

  it('highlights active conversation', () => {
    renderWithProviders(<DirectMessagesList />);

    const conversationElement = screen.getByRole('button', { name: /participant/ }).closest('div');
    expect(conversationElement).toHaveClass('bg-primary-50');
  });

  it('calls onMobileClose when conversation is selected', () => {
    const mockOnMobileClose = vi.fn();
    renderWithProviders(<DirectMessagesList onMobileClose={mockOnMobileClose} />);

    const conversationButton = screen.getByRole('button', { name: /participant/ });
    fireEvent.click(conversationButton);

    expect(mockOnMobileClose).toHaveBeenCalled();
  });

  it('renders search input', () => {
    renderWithProviders(<DirectMessagesList />);

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    expect(searchInput).toBeInTheDocument();
  });

  it('truncates long messages', () => {
    const longMessageConversation = {
      ...mockConversation,
      lastMessage: {
        ...mockMessage,
        content: 'This is a very long message that should be truncated because it exceeds the maximum length allowed for preview'
      }
    };
    const contextWithLongMessage = {
      ...mockDirectMessagesContext,
      conversations: [longMessageConversation]
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <DirectMessagesContext.Provider value={contextWithLongMessage}>
            <DirectMessagesList />
          </DirectMessagesContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/This is a very long message that should be trun.../)).toBeInTheDocument();
  });
});