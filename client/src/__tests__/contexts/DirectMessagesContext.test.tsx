import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectMessagesProvider, useDirectMessages } from '@/contexts/DirectMessagesContext';
import { AuthContext } from '@/contexts/AuthContext';
import { ApiClient } from '@/utils/api';
import { DirectMessage, User, DirectConversation } from '@/types';

// Mock API client
vi.mock('@/utils/api', () => ({
  ApiClient: {
    getDirectConversations: vi.fn(),
    getDirectMessages: vi.fn(),
    sendDirectMessage: vi.fn(),
    markDirectMessagesAsRead: vi.fn()
  }
}));

// Mock socket manager
vi.mock('@/utils/socket', () => ({
  socketManager: {
    getSocket: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    }))
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
  unreadCount: 2,
  lastActivity: '2023-01-01T12:00:00Z'
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={mockAuthContext}>
    <DirectMessagesProvider>
      {children}
    </DirectMessagesProvider>
  </AuthContext.Provider>
);

describe('DirectMessagesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial state', () => {
    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.messages).toEqual({});
    expect(result.current.unreadCounts).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads conversations successfully', async () => {
    vi.mocked(ApiClient.getDirectConversations).mockResolvedValue({
      success: true,
      data: { conversations: [mockConversation] }
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.loadConversations();
    });

    expect(result.current.conversations).toEqual([mockConversation]);
    expect(result.current.unreadCounts).toEqual({ user2: 2 });
    expect(ApiClient.getDirectConversations).toHaveBeenCalled();
  });

  it('handles conversation loading error', async () => {
    vi.mocked(ApiClient.getDirectConversations).mockResolvedValue({
      success: false,
      error: 'Failed to load conversations'
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.loadConversations();
    });

    expect(result.current.error).toBe('Failed to load conversations');
    expect(result.current.conversations).toEqual([]);
  });

  it('loads messages for a conversation', async () => {
    vi.mocked(ApiClient.getDirectMessages).mockResolvedValue({
      success: true,
      data: { messages: [mockMessage] }
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.loadMessages('user2');
    });

    expect(result.current.messages.user2).toEqual([mockMessage]);
    expect(ApiClient.getDirectMessages).toHaveBeenCalledWith('user2');
  });

  it('handles message loading error', async () => {
    vi.mocked(ApiClient.getDirectMessages).mockResolvedValue({
      success: false,
      error: 'Failed to load messages'
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.loadMessages('user2');
    });

    expect(result.current.error).toBe('Failed to load messages');
  });

  it('sends a message successfully', async () => {
    vi.mocked(ApiClient.sendDirectMessage).mockResolvedValue({
      success: true,
      data: mockMessage
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('user2', 'Hello!');
    });

    expect(ApiClient.sendDirectMessage).toHaveBeenCalledWith({
      receiverId: 'user2',
      content: 'Hello!'
    });
  });

  it('handles send message error', async () => {
    vi.mocked(ApiClient.sendDirectMessage).mockResolvedValue({
      success: false,
      error: 'Failed to send message'
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('user2', 'Hello!');
    });

    expect(result.current.error).toBe('Failed to send message');
  });

  it('sets active conversation', () => {
    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    act(() => {
      result.current.setActiveConversation('user2');
    });

    expect(result.current.activeConversation).toBe('user2');
  });

  it('gets unread count for a conversation', () => {
    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    // Set up some unread counts
    act(() => {
      result.current.loadConversations();
    });

    const unreadCount = result.current.getUnreadCount('user2');
    expect(typeof unreadCount).toBe('number');
  });

  it('marks messages as read', async () => {
    vi.mocked(ApiClient.markDirectMessagesAsRead).mockResolvedValue({
      success: true
    });

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.markAsRead('user2');
    });

    expect(ApiClient.markDirectMessagesAsRead).toHaveBeenCalledWith('user2');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    // Set an error first
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useDirectMessages());
    }).toThrow('useDirectMessages must be used within a DirectMessagesProvider');
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(ApiClient.getDirectConversations).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    await act(async () => {
      await result.current.loadConversations();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('updates loading state during operations', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    vi.mocked(ApiClient.getDirectConversations).mockReturnValue(promise);

    const { result } = renderHook(() => useDirectMessages(), { wrapper });

    // Start loading
    act(() => {
      result.current.loadConversations();
    });

    expect(result.current.isLoading).toBe(true);

    // Complete loading
    await act(async () => {
      resolvePromise!({ success: true, data: { conversations: [] } });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});