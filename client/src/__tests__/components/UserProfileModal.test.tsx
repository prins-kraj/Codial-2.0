import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfileModal from '@/components/chat/UserProfileModal';
import { AuthContext } from '@/contexts/AuthContext';
import { UserProfile, User } from '@/types';
import { ApiClient } from '@/utils/api';

// Mock API client
vi.mock('@/utils/api', () => ({
  ApiClient: {
    getUserProfile: vi.fn()
  }
}));

// Mock components
vi.mock('@/components/chat/UserAvatar', () => ({
  default: ({ user }: { user: UserProfile }) => <div data-testid="user-avatar">{user.username}</div>
}));

vi.mock('@/components/chat/UserStatusIndicator', () => ({
  default: ({ status }: { status: string }) => <div data-testid="status-indicator">{status}</div>
}));

vi.mock('@/components/chat/StartChatButton', () => ({
  default: ({ user, onChatStarted }: { user: UserProfile; onChatStarted: () => void }) => (
    <button onClick={onChatStarted} data-testid="start-chat-button">
      Start Chat with {user.username}
    </button>
  )
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

const mockUserProfile: UserProfile = {
  id: 'user2',
  username: 'testuser',
  email: 'test@example.com',
  bio: 'This is my bio',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
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
      {component}
    </AuthContext.Provider>
  );
};

describe('UserProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={false} onClose={vi.fn()} />
    );
    
    expect(screen.queryByText('User Profile')).not.toBeInTheDocument();
  });

  it('renders when open and loads user profile', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(ApiClient.getUserProfile).toHaveBeenCalledWith('user2');
  });

  it('shows loading state while fetching profile', async () => {
    vi.mocked(ApiClient.getUserProfile).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockUserProfile }), 100))
    );

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays user profile information', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('This is my bio')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    });
  });

  it('shows start chat button for other users', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('start-chat-button')).toBeInTheDocument();
    });
  });

  it('does not show start chat button for current user', async () => {
    const currentUserProfile = { ...mockUserProfile, id: 'user1' };
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: currentUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user1" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.queryByTestId('start-chat-button')).not.toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: false,
      error: 'User not found'
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    vi.mocked(ApiClient.getUserProfile).mockRejectedValue(new Error('Network error'));

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('retries loading profile when try again is clicked', async () => {
    vi.mocked(ApiClient.getUserProfile)
      .mockResolvedValueOnce({ success: false, error: 'Network error' })
      .mockResolvedValueOnce({ success: true, data: mockUserProfile });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(ApiClient.getUserProfile).toHaveBeenCalledTimes(2);
  });

  it('closes modal when close button is clicked', () => {
    const mockOnClose = vi.fn();
    
    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={mockOnClose} />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when start chat is clicked', async () => {
    const mockOnClose = vi.fn();
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={mockOnClose} />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('start-chat-button')).toBeInTheDocument();
    });

    const startChatButton = screen.getByTestId('start-chat-button');
    fireEvent.click(startChatButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal on Escape key press', () => {
    const mockOnClose = vi.fn();
    
    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={mockOnClose} />
    );
    
    const modal = screen.getByRole('dialog', { hidden: true });
    fireEvent.keyDown(modal, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears data when modal closes', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    const { rerender } = renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Close modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfileModal userId="user2" isOpen={false} onClose={vi.fn()} />
      </AuthContext.Provider>
    );

    // Reopen modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
      </AuthContext.Provider>
    );

    // Should show loading again
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays formatted dates correctly', async () => {
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: mockUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
      expect(screen.getByText(/Last seen:/)).toBeInTheDocument();
    });
  });

  it('shows online status for online users', async () => {
    const onlineUserProfile = { ...mockUserProfile, status: 'ONLINE' as const };
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: onlineUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Online now')).toBeInTheDocument();
    });
  });

  it('shows relative time for offline users', async () => {
    const offlineUserProfile = { 
      ...mockUserProfile, 
      status: 'OFFLINE' as const,
      lastSeen: '2023-01-01T10:00:00Z'
    };
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: offlineUserProfile
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Online now')).not.toBeInTheDocument();
    });
  });

  it('handles profile without bio', async () => {
    const profileWithoutBio = { ...mockUserProfile, bio: undefined };
    vi.mocked(ApiClient.getUserProfile).mockResolvedValue({
      success: true,
      data: profileWithoutBio
    });

    renderWithProviders(
      <UserProfileModal userId="user2" isOpen={true} onClose={vi.fn()} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.queryByText('This is my bio')).not.toBeInTheDocument();
    });
  });
});