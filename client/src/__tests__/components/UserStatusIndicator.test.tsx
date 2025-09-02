import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserStatusIndicator from '@/components/chat/UserStatusIndicator';
import { UserStatus } from '@/types';

describe('UserStatusIndicator', () => {
  it('renders online status with green color', () => {
    render(<UserStatusIndicator status="ONLINE" size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('renders away status with yellow color', () => {
    render(<UserStatusIndicator status="AWAY" size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('bg-yellow-500');
  });

  it('renders offline status with gray color', () => {
    render(<UserStatusIndicator status="OFFLINE" size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('bg-gray-400');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<UserStatusIndicator status="ONLINE" size="sm" />);
    
    let indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('h-2', 'w-2');
    
    rerender(<UserStatusIndicator status="ONLINE" size="md" />);
    indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('h-3', 'w-3');
    
    rerender(<UserStatusIndicator status="ONLINE" size="lg" />);
    indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('h-4', 'w-4');
  });

  it('applies custom className', () => {
    render(<UserStatusIndicator status="ONLINE" size="md" className="custom-class" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<UserStatusIndicator status="ONLINE" size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveAttribute('aria-label', 'User status: ONLINE');
  });

  it('renders as a circular indicator', () => {
    render(<UserStatusIndicator status="ONLINE" size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('rounded-full');
  });

  it('handles invalid status gracefully', () => {
    render(<UserStatusIndicator status={'INVALID' as UserStatus} size="md" />);
    
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator).toHaveClass('bg-gray-400'); // Should default to offline/gray
  });
});