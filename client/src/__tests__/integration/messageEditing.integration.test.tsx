import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ChatProvider } from '../../contexts/ChatContext';
import { DirectMessagesProvider } from '../../contexts/DirectMessagesContext';
import MessageItem from '../../components/chat/MessageItem';
import MessageActions from '../../components/chat/MessageActions';
import EditMessageInput from '../../components/chat/EditMessageInput';
import MessageList from '../../components/chat/MessageList';
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

const mockCurrentUser = {
  id: 'user1',
  username: 'currentuser',
  email: 'current@example.com',
  status: 'online' as const,
};

const mockOtherUser = {
  id: 'user2',
  username: 'otheruser',
  email: 'other@example.com',
  status: 'online' as const,
};

const mockMessage = {
  id: 'msg1',
  content: 'Original message content',
  userId: 'user1',
  roomId: 'room1',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  editedAt: null,
  isDeleted: false,
  editHistory: [],
  user: mockCurrentUser,
};

const mockEditedMessage = {
  ...mockMessage,
  content: 'Edited message content',
  editedAt: '2024-01-01T10:05:00Z',
  editHistory: [
    {
      content: 'Original message content',
      editedAt: '2024-01-01T10:00:00Z',
    },
  ],
};

const mockDirectMessage = {
  id: 'dm1',
  content: 'Direct message content',
  senderId: 'user1',
  receiverId: 'user2',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  editedAt: null,
  isDeleted: false,
  sender: mockCurrentUser,
  receiver: mockOtherUser,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <ChatProvider>
        <DirectMessagesProvider>
          {children}
        </DirectMessagesProvider>
      </ChatProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Message Editing and Deletion Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth context
    vi.mocked(mockApi.getCurrentUser).mockResolvedValue(mockCurrentUser);
    
    // Setup default API responses
    mockApi.editMessage.mockResolvedValue(mockEditedMessage);
    mockApi.deleteMessage.mockResolvedValue({ message: 'Message deleted successfully' });
    mockApi.editDirectMessage.mockResolvedValue({
      ...mockDirectMessage,
      content: 'Edited direct message',
      editedAt: '2024-01-01T10:05:00Z',
    });
    mockApi.deleteDirectMessage.mockResolvedValue({ message: 'Direct message deleted successfully' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Room Message Editing Workflow', () => {
    test('should handle complete message editing flow', async () => {
      const user = userEvent.setup();

      // 1. Render message with edit capability
      render(
        <TestWrapper>
          <MessageItem 
            message={mockMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // 2. Hover over message to show actions
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      // 3. Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // 4. Verify edit input appears
      const editInput = screen.getByDisplayValue('Original message content');
      expect(editInput).toBeInTheDocument();

      // 5. Edit the message content
      await user.clear(editInput);
      await user.type(editInput, 'Edited message content');

      // 6. Save the edit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApi.editMessage).toHaveBeenCalledWith('msg1', {
          content: 'Edited message content',
        });
      });

      // 7. Verify socket event was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('message_edit_request', {
        messageId: 'msg1',
        content: 'Edited message content',
      });

      // 8. Verify edit indicator appears
      await waitFor(() => {
        expect(screen.getByText('Edited message content')).toBeInTheDocument();
        expect(screen.getByText(/edited/i)).toBeInTheDocument();
      });
    });

    test('should handle message editing cancellation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MessageItem 
            message={mockMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // Start editing
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Modify content
      const editInput = screen.getByDisplayValue('Original message content');
      await user.clear(editInput);
      await user.type(editInput, 'Modified content');

      // Cancel editing
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should revert to original content
      expect(screen.getByText('Original message content')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
      expect(mockApi.editMessage).not.toHaveBeenCalled();
    });

    test('should handle keyboard shortcuts for editing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <EditMessageInput
            initialContent="Original message content"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            messageId="msg1"
          />
        </TestWrapper>
      );

      const editInput = screen.getByDisplayValue('Original message content');

      // Test Escape key to cancel
      await user.type(editInput, ' modified');
      await user.keyboard('{Escape}');

      // Should trigger cancel
      expect(screen.getByDisplayValue('Original message content modified')).toBeInTheDocument();

      // Test Ctrl+Enter to save
      await user.keyboard('{Control>}{Enter}{/Control}');

      // Should trigger save
      await waitFor(() => {
        expect(mockApi.editMessage).toHaveBeenCalled();
      });
    });

    test('should handle message deletion workflow', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MessageItem 
            message={mockMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // Hover to show actions
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.deleteMessage).toHaveBeenCalledWith('msg1');
      });

      // Verify socket event was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('message_delete_request', {
        messageId: 'msg1',
      });

      // Verify message shows as deleted
      await waitFor(() => {
        expect(screen.getByText(/message deleted/i)).toBeInTheDocument();
      });
    });

    test('should prevent editing/deleting other users messages', async () => {
      const user = userEvent.setup();

      const otherUserMessage = {
        ...mockMessage,
        userId: 'user2',
        user: mockOtherUser,
      };

      render(
        <TestWrapper>
          <MessageItem 
            message={otherUserMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // Hover over message
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      // Should not show edit/delete buttons for other users' messages
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('Direct Message Editing Workflow', () => {
    test('should handle direct message editing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MessageItem 
            message={mockDirectMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            isDirectMessage={true}
          />
        </TestWrapper>
      );

      // Start editing
      const messageElement = screen.getByText('Direct message content');
      await user.hover(messageElement);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Edit content
      const editInput = screen.getByDisplayValue('Direct message content');
      await user.clear(editInput);
      await user.type(editInput, 'Edited direct message');

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApi.editDirectMessage).toHaveBeenCalledWith('dm1', {
          content: 'Edited direct message',
        });
      });

      // Verify socket event for direct message
      expect(mockSocket.emit).toHaveBeenCalledWith('direct_message_edited', {
        messageId: 'dm1',
        content: 'Edited direct message',
      });
    });

    test('should handle direct message deletion', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MessageItem 
            message={mockDirectMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            isDirectMessage={true}
          />
        </TestWrapper>
      );

      // Delete message
      const messageElement = screen.getByText('Direct message content');
      await user.hover(messageElement);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.deleteDirectMessage).toHaveBeenCalledWith('dm1');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('direct_message_deleted', {
        messageId: 'dm1',
      });
    });
  });

  describe('Real-time Message Updates', () => {
    test('should handle real-time message edit events', async () => {
      // Setup socket event handler
      let editHandler: (data: any) => void;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'message_edited') {
          editHandler = handler;
        }
      });

      const messages = [mockMessage];

      render(
        <TestWrapper>
          <MessageList messages={messages} currentUserId="user1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('message_edited', expect.any(Function));
      });

      // Simulate receiving edit event
      const editEvent = {
        id: 'msg1',
        content: 'Edited by another user',
        editedAt: '2024-01-01T10:05:00Z',
      };

      editHandler!(editEvent);

      // Should update message content
      await waitFor(() => {
        expect(screen.getByText('Edited by another user')).toBeInTheDocument();
        expect(screen.getByText(/edited/i)).toBeInTheDocument();
      });
    });

    test('should handle real-time message delete events', async () => {
      let deleteHandler: (data: any) => void;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'message_deleted') {
          deleteHandler = handler;
        }
      });

      const messages = [mockMessage];

      render(
        <TestWrapper>
          <MessageList messages={messages} currentUserId="user1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('message_deleted', expect.any(Function));
      });

      // Simulate receiving delete event
      const deleteEvent = {
        id: 'msg1',
        isDeleted: true,
      };

      deleteHandler!(deleteEvent);

      // Should show deleted message placeholder
      await waitFor(() => {
        expect(screen.getByText(/message deleted/i)).toBeInTheDocument();
      });
    });

    test('should handle real-time direct message edit events', async () => {
      let dmEditHandler: (data: any) => void;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'direct_message_edited') {
          dmEditHandler = handler;
        }
      });

      const messages = [mockDirectMessage];

      render(
        <TestWrapper>
          <MessageList messages={messages} currentUserId="user1" isDirectMessage={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('direct_message_edited', expect.any(Function));
      });

      // Simulate receiving direct message edit event
      const editEvent = {
        id: 'dm1',
        content: 'Edited direct message content',
        editedAt: '2024-01-01T10:05:00Z',
      };

      dmEditHandler!(editEvent);

      await waitFor(() => {
        expect(screen.getByText('Edited direct message content')).toBeInTheDocument();
      });
    });
  });

  describe('Message Actions Integration', () => {
    test('should show appropriate actions based on message ownership', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MessageActions 
            message={mockMessage}
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onCopy={vi.fn()}
          />
        </TestWrapper>
      );

      // Should show edit and delete for own messages
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    test('should show limited actions for other users messages', async () => {
      const otherUserMessage = {
        ...mockMessage,
        userId: 'user2',
        user: mockOtherUser,
      };

      render(
        <TestWrapper>
          <MessageActions 
            message={otherUserMessage}
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onCopy={vi.fn()}
          />
        </TestWrapper>
      );

      // Should only show copy for other users' messages
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    test('should handle copy message functionality', async () => {
      const user = userEvent.setup();
      const mockCopy = vi.fn();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: mockCopy,
        },
      });

      render(
        <TestWrapper>
          <MessageActions 
            message={mockMessage}
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onCopy={vi.fn()}
          />
        </TestWrapper>
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      expect(mockCopy).toHaveBeenCalledWith('Original message content');
    });
  });

  describe('Error Handling', () => {
    test('should handle edit API errors', async () => {
      const user = userEvent.setup();

      mockApi.editMessage.mockRejectedValue(new Error('Edit failed'));

      render(
        <TestWrapper>
          <MessageItem 
            message={mockMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // Start editing and save
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const editInput = screen.getByDisplayValue('Original message content');
      await user.clear(editInput);
      await user.type(editInput, 'Failed edit');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to edit/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Should revert to original content
      expect(screen.getByText('Original message content')).toBeInTheDocument();
    });

    test('should handle delete API errors', async () => {
      const user = userEvent.setup();

      mockApi.deleteMessage.mockRejectedValue(new Error('Delete failed'));

      render(
        <TestWrapper>
          <MessageItem 
            message={mockMessage} 
            currentUserId="user1"
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </TestWrapper>
      );

      // Try to delete
      const messageElement = screen.getByText('Original message content');
      await user.hover(messageElement);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to delete/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Message should still be visible
      expect(screen.getByText('Original message content')).toBeInTheDocument();
    });
  });
});