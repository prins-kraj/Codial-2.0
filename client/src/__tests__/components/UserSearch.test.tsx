import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserSearch from '@/components/chat/UserSearch';
import { DirectMessagesContext } from '@/contexts/DirectMessagesContext';
import { AuthContext } from '@/contexts/AuthContext';
import { User } from '@/types';
import { ApiClient } from '@/utils/api';

// Mock API client
vi.mock('@/utils/api', () => ({
  ApiClient: {
    searchUsers: vi.fn()
  }
}));

// Mock debounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value // Return value immediately for testing
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock components
vi.mock('@/components/chat/UserAvatar', () => ({
  default: ({ user }: { user: User }) => <div data-testid="user-avatar">{user.username}</div>
}));

vi.mock('@/components/chat/UserStatusIndicator', () => ({
  default: ({ status }: { status: string }) => <div data-testid="status-indicator">{status}</div>
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  default: ({ size }: { size?: string }) => <div data-testid="loading-spinner" data-size={size}>Loading...</div>
}));

const mockCurrentUser: User = {
  id: 'user1',
  username: 'currentuser',
  email: 'current@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
};

const mockSearchResults: User[] = [
  {
    id: 'user2',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test user bio',
    status: 'ONLINE',
    createdAt: '2023-01-01T00:00:00Z',
    lastSeen: '2023-01-01T00:00:00Z'
  },
  {
    id: 'user3',
    username: 'anotheruser',
    email: 'another@example.com',
    status: 'AWAY',
    createdAt: '2023-01-01T00:00:00Z',
    lastSeen: '2023-01-01T00:00:00Z'
  }
];

const mockDirectMessagesContext = {
  conversations: [],
  activeConversation: null,
  messages: {},
  unreadCounts: {},
  isLoading: false,
  error: null,
  setActiveConversation: vi.fn(),
  getUnreadCount: vi.fn(),
  loadConversations: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  clearError: vi.fn()
};

const mockAuthContext = {
  user: mockCurrentUser,
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

describe('UserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <UserSearch isOpen={false} onClose={vi.fn()} />
    );
    
    expect(screen.queryByText('Start New Chat')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    expect(screen.getByText('Start New Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search users by username or email...')).toBeInTheDocument();
  });

  it('shows initial empty state', () => {
    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    expect(screen.getByText('Search for users to start a conversation')).toBeInTheDocument();
  });

  it('shows minimum character requirement', () => {
    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'a' } });
    
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('searches users when typing', async () => {
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: mockSearchResults
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(ApiClient.searchUsers).toHaveBeenCalledWith('test');
    });
  });

  it('displays search results', async () => {
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: mockSearchResults
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test user bio')).toBeInTheDocument();
      expect(screen.getByText('anotheruser')).toBeInTheDocument();
    });
  });

  it('filters out current user from results', async () => {
    const resultsWithCurrentUser = [
      ...mockSearchResults,
      mockCurrentUser
    ];

    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: resultsWithCurrentUser
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'user' } });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.queryByText('currentuser')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while searching', async () => {
    vi.mocked(ApiClient.searchUsers).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
    );

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows no results message', async () => {
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: []
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No users found matching "nonexistent"')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: false,
      error: 'Search failed'
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    vi.mocked(ApiClient.searchUsers).mockRejectedValue(new Error('Network error'));

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('starts chat when chat button is clicked', async () => {
    const toast = require('react-hot-toast').default;
    const mockOnStartChat = vi.fn();
    const mockOnClose = vi.fn();

    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: mockSearchResults
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={mockOnClose} onStartChat={mockOnStartChat} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const chatButtons = screen.getAllByText('Chat');
    fireEvent.click(chatButtons[0]);
    
    expect(mockDirectMessagesContext.setActiveConversation).toHaveBeenCalledWith('user2');
    expect(mockOnStartChat).toHaveBeenCalledWith('user2');
    expect(mockOnClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Started conversation with testuser');
  });

  it('closes modal when close button is clicked', () => {
    const mockOnClose = vi.fn();
    
    renderWithProviders(
      <UserSearch isOpen={true} onClose={mockOnClose} />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal on Escape key press', () => {
    const mockOnClose = vi.fn();
    
    renderWithProviders(
      <UserSearch isOpen={true} onClose={mockOnClose} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears search when modal closes', () => {
    const { rerender } = renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Close modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={mockDirectMessagesContext}>
          <UserSearch isOpen={false} onClose={vi.fn()} />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );

    // Reopen modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <DirectMessagesContext.Provider value={mockDirectMessagesContext}>
          <UserSearch isOpen={true} onClose={vi.fn()} />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );
    
    const reopenedInput = screen.getByPlaceholderText('Search users by username or email...');
    expect(reopenedInput).toHaveValue('');
  });

  it('handles onStartChat callback gracefully when not provided', async () => {
    const toast = require('react-hot-toast').default;
    const mockOnClose = vi.fn();

    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: mockSearchResults
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={mockOnClose} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const chatButtons = screen.getAllByText('Chat');
    
    // Should not throw error when onStartChat is not provided
    expect(() => fireEvent.click(chatButtons[0])).not.toThrow();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays user bio when available', async () => {
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: mockSearchResults
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test user bio')).toBeInTheDocument();
    });
  });

  it('does not display bio when not available', async () => {
    const resultsWithoutBio = mockSearchResults.map(user => ({ ...user, bio: undefined }));
    
    vi.mocked(ApiClient.searchUsers).mockResolvedValue({
      success: true,
      data: resultsWithoutBio
    });

    renderWithProviders(
      <UserSearch isOpen={true} onClose={vi.fn()} />
    );
    
    const searchInput = screen.getByPlaceholderText('Search users by username or email...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.queryByText('Test user bio')).not.toBeInTheDocument();
    });
  });
});