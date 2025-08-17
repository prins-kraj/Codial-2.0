import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import MessageInput from '@/components/chat/MessageInput';

// Mock the contexts
const mockSendMessage = vi.fn();
const mockStartTyping = vi.fn();
const mockStopTyping = vi.fn();

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({
    sendMessage: mockSendMessage,
    startTyping: mockStartTyping,
    stopTyping: mockStopTyping,
    currentRoom: {
      id: 'room-1',
      name: 'Test Room',
      description: 'Test room description',
      isPrivate: false,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: { id: 'user-1', username: 'creator' },
      memberCount: 5,
      messageCount: 10,
      members: [],
      isJoined: true,
    },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      status: 'ONLINE',
    },
    isAuthenticated: true,
  }),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn(),
  __esModule: true,
  default: vi.fn(),
}));

const MockedMessageInput = () => (
  <BrowserRouter>
    <AuthProvider>
      <ChatProvider>
        <MessageInput />
      </ChatProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('MessageInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders message input correctly', () => {
    render(<MockedMessageInput />);

    expect(
      screen.getByPlaceholderText('Message #Test Room')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // Send button
  });

  it('handles text input and auto-resize', () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');

    fireEvent.change(textarea, { target: { value: 'Hello world!' } });

    expect(textarea).toHaveValue('Hello world!');
  });

  it('sends message on Enter key', async () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('does not send message on Shift+Enter', () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('sends message on form submit', async () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');
    const sendButton = screen.getByRole('button');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('disables send button for empty messages', () => {
    render(<MockedMessageInput />);

    const sendButton = screen.getByRole('button');

    expect(sendButton).toBeDisabled();
  });

  it('enables send button for non-empty messages', () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');
    const sendButton = screen.getByRole('button');

    fireEvent.change(textarea, { target: { value: 'Test message' } });

    expect(sendButton).not.toBeDisabled();
  });

  it('shows character count when near limit', () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');
    const longMessage = 'a'.repeat(950); // Near the 1000 character limit

    fireEvent.change(textarea, { target: { value: longMessage } });

    expect(screen.getByText('50 characters remaining')).toBeInTheDocument();
  });

  it('prevents input beyond character limit', () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');
    const maxMessage = 'a'.repeat(1000);
    const overLimitMessage = maxMessage + 'extra';

    fireEvent.change(textarea, { target: { value: overLimitMessage } });

    // Should not exceed the limit
    expect(textarea).toHaveValue(maxMessage);
  });

  it('handles typing indicators', async () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');

    fireEvent.change(textarea, { target: { value: 'T' } });

    await waitFor(() => {
      expect(mockStartTyping).toHaveBeenCalled();
    });
  });

  it('clears input after sending message', async () => {
    render(<MockedMessageInput />);

    const textarea = screen.getByPlaceholderText('Message #Test Room');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });
});
