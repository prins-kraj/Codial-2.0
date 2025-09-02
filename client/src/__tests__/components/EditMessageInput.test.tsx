import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditMessageInput from '@/components/chat/EditMessageInput';
import { Message } from '@/types';

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

describe('EditMessageInput', () => {
  it('renders with message content', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <EditMessageInput
        message={mockMessage}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Test message');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <EditMessageInput
        message={mockMessage}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSave when save button is clicked with valid content', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <EditMessageInput
        message={mockMessage}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Test message');
    fireEvent.change(textarea, { target: { value: 'Updated message' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('Updated message');
  });
});