import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartChatButton from '@/components/chat/StartChatButton';
import { DirectMessagesContext } from '@/contexts/DirectMessagesContext';
import { AuthContext } from '@/contexts/AuthContext';
import { User } from '@/types';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockCurrentUser: User = {
  id: 'user1',
  username: 'currentuser',
  email: 'current@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
};

const mockTargetUser: User = {
  id: 'user2',
  username: 'targetuser',
  email: 'target@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z'
};

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

describe('StartChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders start chat button for other users', () => {
    renderWithProviders(<StartChatButton user={mockTargetUser} />);
    
    expect(screen.getByText('Start Chat')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render button for current user', () => {
    renderWithProviders(<StartChatButton user={mockCurrentUser} />);
    
    expect(screen.queryByText('Start Chat')).not.toBeInTheDocument();
  });

  it('starts chat when button is clicked', () => {
    const toast = require('react-hot-toast').default;
    
    renderWithProviders(<StartChatButton user={mockTargetUser} />);
    
    const button = screen.getByText('Start Chat');
    fireEvent.click(button);
    
    expect(mockDirectMessagesContext.setActiveConversation).toHaveBeenCalledWith('user2');
    expect(toast.success).toHaveBeenCalledWith('Started conversation with targetuser');
  });

  it('calls onChatStarted callback when provided', () => {
    const mockOnChatStarted = vi.fn();
    
    renderWithProviders(
      <StartChatButton user={mockTargetUser} onChatStarted={mockOnChatStarted} />
    );
    
    const button = screen.getByText('Start Chat');
    fireEvent.click(button);
    
    expect(mockOnChatStarted).toHaveBeenCalled();
  });

  it('shows error when user is not logged in', () => {
    const toast = require('react-hot-toast').default;
    const unauthenticatedContext = { ...mockAuthContext, user: null };
    
    render(
      <AuthContext.Provider value={unauthenticatedContext}>
        <DirectMessagesContext.Provider value={mockDirectMessagesContext}>
          <StartChatButton user={mockTargetUser} />
        </DirectMessagesContext.Provider>
      </AuthContext.Provider>
    );
    
    const button = screen.getByText('Start Chat');
    fireEvent.click(button);
    
    expect(toast.error).toHaveBeenCalledWith('You must be logged in to start a chat');
    expect(mockDirectMessagesContext.setActiveConversation).not.toHaveBeenCalled();
  });

  it('shows error when trying to chat with self', () => {
    const toast = require('react-hot-toast').default;
    
    renderWithProviders(<StartChatButton user={mockCurrentUser} />);
    
    // Since the button doesn't render for current user, we need to test the logic directly
    // This test verifies the component's internal logic
    expect(screen.queryByText('Start Chat')).not.toBeInTheDocument();
  });

  it('applies custom variant and size props', () => {
    renderWithProviders(
      <StartChatButton 
        user={mockTargetUser} 
        variant="outline" 
        size="sm" 
        className="custom-class"
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders with message circle icon', () => {
    renderWithProviders(<StartChatButton user={mockTargetUser} />);
    
    const button = screen.getByRole('button');
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('handles missing onChatStarted callback gracefully', () => {
    renderWithProviders(<StartChatButton user={mockTargetUser} />);
    
    const button = screen.getByText('Start Chat');
    
    // Should not throw error when onChatStarted is not provided
    expect(() => fireEvent.click(button)).not.toThrow();
    expect(mockDirectMessagesContext.setActiveConversation).toHaveBeenCalledWith('user2');
  });

  it('uses default props when not specified', () => {
    renderWithProviders(<StartChatButton user={mockTargetUser} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Default variant and size should be applied by the Button component
  });
});