import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import SettingsModal from '../../components/chat/SettingsModal';
import * as api from '../../utils/api';

// Mock API calls
vi.mock('../../utils/api');
const mockApi = vi.mocked(api);

const mockUser = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  status: 'online' as const,
};

const mockSettings = {
  theme: 'light' as const,
  notifications: true,
  soundEnabled: true,
  emailNotifications: true,
  showOnlineStatus: true,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Settings Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth context
    vi.mocked(mockApi.getCurrentUser).mockResolvedValue(mockUser);
    
    // Setup default API responses
    mockApi.getUserSettings.mockResolvedValue(mockSettings);
    mockApi.updateUserSettings.mockResolvedValue({
      ...mockSettings,
      theme: 'dark',
      notifications: false,
    });
    mockApi.changePassword.mockResolvedValue({ message: 'Password updated successfully' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Settings Management Workflow', () => {
    test('should handle complete settings management flow', async () => {
      const user = userEvent.setup();

      // 1. Render settings modal
      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.getUserSettings).toHaveBeenCalled();
      });

      // 2. Verify initial settings are displayed
      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /notifications/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /sound/i })).toBeChecked();
      });

      // 3. Change theme setting
      const darkThemeRadio = screen.getByRole('radio', { name: /dark/i });
      await user.click(darkThemeRadio);

      expect(darkThemeRadio).toBeChecked();

      // 4. Toggle notification settings
      const notificationsCheckbox = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationsCheckbox);

      expect(notificationsCheckbox).not.toBeChecked();

      // 5. Save settings
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApi.updateUserSettings).toHaveBeenCalledWith({
          theme: 'dark',
          notifications: false,
          soundEnabled: true,
          emailNotifications: true,
          showOnlineStatus: true,
        });
      });

      // 6. Verify success feedback
      await waitFor(() => {
        expect(screen.getByText(/settings saved/i) || screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    test('should handle tabbed interface navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /preferences/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument();
      });

      // 1. Start on preferences tab (default)
      expect(screen.getByRole('tab', { name: /preferences/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();

      // 2. Switch to account tab
      const accountTab = screen.getByRole('tab', { name: /account/i });
      await user.click(accountTab);

      expect(accountTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/change password/i)).toBeInTheDocument();

      // 3. Switch back to preferences tab
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      expect(preferencesTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
    });

    test('should handle password change workflow', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      // Navigate to account tab
      const accountTab = screen.getByRole('tab', { name: /account/i });
      await user.click(accountTab);

      await waitFor(() => {
        expect(screen.getByText(/change password/i)).toBeInTheDocument();
      });

      // Fill in password form
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(currentPasswordInput, 'oldpassword123');
      await user.type(newPasswordInput, 'newpassword456');
      await user.type(confirmPasswordInput, 'newpassword456');

      // Submit password change
      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(mockApi.changePassword).toHaveBeenCalledWith({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword456',
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
      });

      // Form should be reset
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });

    test('should handle password validation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      // Navigate to account tab
      const accountTab = screen.getByRole('tab', { name: /account/i });
      await user.click(accountTab);

      // Test password mismatch
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(newPasswordInput, 'newpassword456');
      await user.type(confirmPasswordInput, 'differentpassword');

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(mockApi.changePassword).not.toHaveBeenCalled();
    });

    test('should handle settings persistence across modal sessions', async () => {
      const user = userEvent.setup();

      // First session - change settings
      const { rerender } = render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
      });

      // Change to dark theme
      const darkThemeRadio = screen.getByRole('radio', { name: /dark/i });
      await user.click(darkThemeRadio);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApi.updateUserSettings).toHaveBeenCalled();
      });

      // Mock updated settings for next session
      mockApi.getUserSettings.mockResolvedValue({
        ...mockSettings,
        theme: 'dark',
      });

      // Second session - reopen modal
      rerender(
        <TestWrapper>
          <SettingsModal isOpen={false} onClose={vi.fn()} />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      // Should show updated settings
      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /dark/i })).toBeChecked();
      });
    });

    test('should handle theme application', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
      });

      // Change to dark theme
      const darkThemeRadio = screen.getByRole('radio', { name: /dark/i });
      await user.click(darkThemeRadio);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify theme is applied to document
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark') || 
        expect(document.body).toHaveClass('dark-theme');
      });
    });

    test('should handle settings validation errors', async () => {
      const user = userEvent.setup();

      // Mock validation error
      mockApi.updateUserSettings.mockRejectedValue({
        response: {
          data: {
            errors: [
              { field: 'theme', message: 'Invalid theme value' },
            ],
          },
        },
      });

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
      });

      // Try to save invalid settings
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid theme value/i)).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      mockApi.updateUserSettings.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
      });

      // Try to save settings
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    test('should handle loading states', async () => {
      // Mock delayed API response
      mockApi.getUserSettings.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSettings), 100))
      );

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
      });
    });

    test('should handle partial settings updates', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /notifications/i })).toBeChecked();
      });

      // Only change notifications setting
      const notificationsCheckbox = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationsCheckbox);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should only update changed settings
      await waitFor(() => {
        expect(mockApi.updateUserSettings).toHaveBeenCalledWith({
          theme: 'light',
          notifications: false,
          soundEnabled: true,
          emailNotifications: true,
          showOnlineStatus: true,
        });
      });
    });
  });

  describe('Settings Context Integration', () => {
    test('should provide settings to child components', async () => {
      const TestComponent = () => {
        const { settings } = React.useContext(SettingsContext);
        return <div data-testid="theme">{settings.theme}</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
    });

    test('should update settings across all consuming components', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const { settings } = React.useContext(SettingsContext);
        return <div data-testid="theme">{settings.theme}</div>;
      };

      render(
        <TestWrapper>
          <div>
            <SettingsModal isOpen={true} onClose={vi.fn()} />
            <TestComponent />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      // Change theme in modal
      const darkThemeRadio = screen.getByRole('radio', { name: /dark/i });
      await user.click(darkThemeRadio);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Test component should show updated theme
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });
  });
});