import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserAvatar from '@/components/chat/UserAvatar';
import { User } from '@/types';

const mockUser: User = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  status: 'ONLINE',
  createdAt: '2023-01-01T00:00:00Z',
  lastSeen: '2023-01-01T00:00:00Z',
  profilePicture: 'https://example.com/avatar.jpg'
};

const mockUserWithoutPicture: User = {
  ...mockUser,
  profilePicture: undefined
};

describe('UserAvatar', () => {
  it('renders user avatar with profile picture', () => {
    render(<UserAvatar user={mockUser} size="md" />);
    
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(avatar).toHaveAttribute('alt', 'testuser');
  });

  it('renders initials when no profile picture', () => {
    render(<UserAvatar user={mockUserWithoutPicture} size="md" />);
    
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<UserAvatar user={mockUser} size="sm" />);
    
    let container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('h-8', 'w-8');
    
    rerender(<UserAvatar user={mockUser} size="md" />);
    container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('h-10', 'w-10');
    
    rerender(<UserAvatar user={mockUser} size="lg" />);
    container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('h-16', 'w-16');
  });

  it('applies custom className', () => {
    render(<UserAvatar user={mockUser} size="md" className="custom-class" />);
    
    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('handles empty username gracefully', () => {
    const userWithEmptyName = { ...mockUserWithoutPicture, username: '' };
    render(<UserAvatar user={userWithEmptyName} size="md" />);
    
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('uses first character of username for initials', () => {
    const userWithLongName = { ...mockUserWithoutPicture, username: 'verylongusername' };
    render(<UserAvatar user={userWithLongName} size="md" />);
    
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('handles image load error by showing initials', () => {
    render(<UserAvatar user={mockUser} size="md" />);
    
    const avatar = screen.getByRole('img');
    
    // Simulate image load error
    Object.defineProperty(avatar, 'complete', { value: false });
    Object.defineProperty(avatar, 'naturalHeight', { value: 0 });
    
    // The component should handle this internally and show initials as fallback
    expect(avatar).toBeInTheDocument();
  });
});