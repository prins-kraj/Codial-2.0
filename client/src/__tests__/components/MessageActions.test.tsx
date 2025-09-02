import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageActions from '@/components/chat/MessageActions';
import { AuthProvider } from '@/contexts/AuthContext';
import { Message } from '@/types';

// Mock the auth context
const mockUser = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  status: 'ONLINE' as const
};

const mockMessage: Message = {
  id: 'msg1',
  content: 'Test message',
  userId: 'user1',
  roomId: 'room1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  isDeleted: false,
  user: {
    id: 'user1',
    username: 'testuser'
  }
};

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

describe('MessageActions', () => {
  it('renders message actions button', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <MockAuthProvider>
        <MessageActions
          message={mockMessage}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      </MockAuthProvider>
    );

    const actionsButton = screen.getByLabelText('Message actions');
    expect(actionsButton).toBeInTheDocument();
  });

  it('shows menu when actions button is clicked', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <MockAuthProvider>
        <MessageActions
          message={mockMessage}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      </MockAuthProvider>
    );

    const actionsButton = screen.getByLabelText('Message actions');
    fireEvent.click(actionsButton);

    expect(screen.getByText('Copy message')).toBeInTheDocument();
  });
});