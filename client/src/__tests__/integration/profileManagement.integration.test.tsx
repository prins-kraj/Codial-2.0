import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { UserProfileProvider } from '../../contexts/UserProfileContext';
import UserProfileModal from '../../components/chat/UserProfileModal';
import UserProfile from '../../components/chat/UserProfile';
import StartChatButton from '../../components/chat/StartChatButton';
import * as api from '../../utils/api';

// Mock API calls
vi.mock('../../utils/api');
const mockApi = vi.mocked(api);

const mockCurrentUser = {
  id: 'user1',
  username: 'currentuser',
  email: 'current@example.com',
  bio: 'Current user bio',
  profilePicture: null,
  status: 'online' as const,
  createdAt: '2024-01-01T00:00:00Z',
  lastSeen: '2024-01-01T12:00:00Z',
};

const mockOtherUser = {
  id: 'user2',
  username: 'otheruser',
  email: 'other@example.com',
  bio: 'Other user bio',
  profilePicture: 'https://example.com/avatar.jpg',
  status: 'busy' as const,
  createdAt: '2024-01-01T00:00:00Z',
  lastSeen: '2024-01-01T11:00:00Z',
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Profile Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth context
    vi.mocked(mockApi.getCurrentUser).mockResolvedValue(mockCurrentUser);
    
    // Setup default API responses
    mockApi.getUserProfile.mockImplementation((userId) => {
      if (userId === 'user1') return Promise.resolve(mockCurrentUser);
      if (userId === 'user2') return Promise.resolve(mockOtherUser);
      return Promise.reject(new Error('User not found'));
    });
    
    mockApi.updateUserProfile.mockResolvedValue({
      ...mockCurrentUser,
      bio: 'Updated bio',
      username: 'updateduser',
    });
    
    mockApi.updateUserStatus.mockResolvedValue({
      ...mockCurrentUser,
      status: 'busy',
    });
    
    mockApi.uploadProfilePicture.mockResolvedValue({
      profilePicture: 'https://example.com/new-avatar.jpg',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Viewing and Editing Workflow', () => {
    test('should handle complete profile viewing and editing flow', async () => {
      const user = userEvent.setup();

      // 1. Render user profile modal for current user (editable)
      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getUserProfile).toHaveBeenCalledWith('user1');
      });

      // 2. Verify profile information is displayed
      await waitFor(() => {
        expect(screen.getByDisplayValue('currentuser')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Current user bio')).toBeInTheDocument();
        expect(screen.getByText('current@example.com')).toBeInTheDocument();
      });

      // 3. Edit profile information
      const usernameInput = screen.getByDisplayValue('currentuser');
      const bioInput = screen.getByDisplayValue('Current user bio');

      await user.clear(usernameInput);
      await user.type(usernameInput, 'updateduser');

      await user.clear(bioInput);
      await user.type(bioInput, 'Updated bio');

      // 4. Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApi.updateUserProfile).toHaveBeenCalledWith({
          username: 'updateduser',
          bio: 'Updated bio',
        });
      });

      // 5. Verify success feedback
      await waitFor(() => {
        expect(screen.getByText(/profile updated/i) || screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    test('should handle profile picture upload workflow', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('currentuser')).toBeInTheDocument();
      });

      // Create a mock file
      const file = new File(['fake image'], 'avatar.jpg', { type: 'image/jpeg' });

      // Find file input (might be hidden)
      const fileInput = screen.getByLabelText(/upload.*picture/i) || 
                       screen.getByRole('button', { name: /change.*picture/i });

      // Upload file
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockApi.uploadProfilePicture).toHaveBeenCalledWith(expect.any(FormData));
      });

      // Verify new profile picture is displayed
      await waitFor(() => {
        const img = screen.getByRole('img', { name: /profile/i });
        expect(img).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
      });
    });

    test('should handle status updates', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('online')).toBeInTheDocument();
      });

      // Change status
      const statusSelect = screen.getByRole('combobox') || screen.getByDisplayValue('online');
      await user.click(statusSelect);

      const busyOption = screen.getByText('busy');
      await user.click(busyOption);

      await waitFor(() => {
        expect(mockApi.updateUserStatus).toHaveBeenCalledWith('busy');
      });

      // Verify status updated
      await waitFor(() => {
        expect(screen.getByText('busy')).toBeInTheDocument();
      });
    });

    test('should handle read-only profile viewing for other users', async () => {
      const user = userEvent.setup();

      // Render profile for other user (read-only)
      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user2" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getUserProfile).toHaveBeenCalledWith('user2');
      });

      // Verify profile information is displayed but not editable
      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
        expect(screen.getByText('Other user bio')).toBeInTheDocument();
        expect(screen.getByText('busy')).toBeInTheDocument();
      });

      // Verify no edit controls are present
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // Verify "Start Chat" button is present
      expect(screen.getByRole('button', { name: /start chat/i })).toBeInTheDocument();
    });

    test('should handle profile validation errors', async () => {
      const user = userEvent.setup();

      // Mock validation error
      mockApi.updateUserProfile.mockRejectedValue({
        response: {
          data: {
            errors: [
              { field: 'username', message: 'Username is too short' },
              { field: 'bio', message: 'Bio is too long' },
            ],
          },
        },
      });

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('currentuser')).toBeInTheDocument();
      });

      // Try to save invalid data
      const usernameInput = screen.getByDisplayValue('currentuser');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab'); // Too short

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify error messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Username is too short')).toBeInTheDocument();
        expect(screen.getByText('Bio is too long')).toBeInTheDocument();
      });
    });
  });

  describe('Start Chat Integration', () => {
    test('should handle starting chat from profile', async () => {
      const user = userEvent.setup();
      const mockOnStartChat = vi.fn();

      render(
        <TestWrapper>
          <StartChatButton userId="user2" onStartChat={mockOnStartChat} />
        </TestWrapper>
      );

      const startChatButton = screen.getByRole('button', { name: /start chat/i });
      await user.click(startChatButton);

      expect(mockOnStartChat).toHaveBeenCalledWith('user2');
    });

    test('should integrate profile viewing with direct messaging', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      const mockOnStartChat = vi.fn();

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user2" 
            isOpen={true} 
            onClose={mockOnClose}
            onStartChat={mockOnStartChat}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
      });

      // Click start chat button
      const startChatButton = screen.getByRole('button', { name: /start chat/i });
      await user.click(startChatButton);

      expect(mockOnStartChat).toHaveBeenCalledWith('user2');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Profile Loading and Error States', () => {
    test('should handle profile loading state', async () => {
      // Mock delayed API response
      mockApi.getUserProfile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockCurrentUser), 100))
      );

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByDisplayValue('currentuser')).toBeInTheDocument();
      });
    });

    test('should handle profile not found error', async () => {
      mockApi.getUserProfile.mockRejectedValue(new Error('User not found'));

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="nonexistent" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/user not found/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      mockApi.updateUserProfile.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserProfileModal 
            userId="user1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('currentuser')).toBeInTheDocument();
      });

      // Try to save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Profile Context Integration', () => {
    test('should cache profile data across components', async () => {
      // Render profile modal first
      const { rerender } = render(
        <TestWrapper>
          <UserProfileModal 
            userId="user2" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getUserProfile).toHaveBeenCalledWith('user2');
      });

      // Render profile component for same user
      rerender(
        <TestWrapper>
          <UserProfile userId="user2" />
        </TestWrapper>
      );

      // Should not make another API call (cached)
      expect(mockApi.getUserProfile).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
      });
    });

    test('should update profile data across all components when edited', async () => {
      const user = userEvent.setup();

      // Render both profile modal and profile component
      render(
        <TestWrapper>
          <div>
            <UserProfileModal 
              userId="user1" 
              isOpen={true} 
              onClose={vi.fn()} 
            />
            <UserProfile userId="user1" />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('currentuser')).toHaveLength(2);
      });

      // Edit username in modal
      const usernameInput = screen.getByDisplayValue('currentuser');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'updateduser');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Both components should show updated username
      await waitFor(() => {
        expect(screen.getAllByText('updateduser')).toHaveLength(2);
      });
    });
  });
});