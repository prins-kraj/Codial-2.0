import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsModal from '@/components/chat/SettingsModal';
import { SettingsContext } from '@/contexts/SettingsContext';
import { AuthContext } from '@/contexts/AuthContext';
import { UserSettings, User } from '@/types';

// Mock components
vi.mock('@/components/ui/Modal', () => ({
  default: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
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

const mockSettings: UserSettings = {
  id: 'settings1',
  userId: 'user1',
  theme: 'light',
  notifications: true,
  soundEnabled: true,
  emailNotifications: true,
  showOnlineStatus: true
};

const mockSettingsContext = {
  settings: mockSettings,
  activeTab: 'account',
  isLoading: false,
  error: null,
  updateSettings: vi.fn(),
  changePassword: vi.fn(),
  setActiveTab: vi.fn(),
  clearError: vi.fn()
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <SettingsContext.Provider value={mockSettingsContext}>
        {component}
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    renderWithProviders(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Settings');
  });

  it('renders navigation tabs', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('switches tabs when clicked', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    const preferencesTab = screen.getByText('Preferences');
    fireEvent.click(preferencesTab);
    
    expect(mockSettingsContext.setActiveTab).toHaveBeenCalledWith('preferences');
  });

  it('displays user information in account tab', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles password change form submission', async () => {
    mockSettingsContext.changePassword.mockResolvedValue(true);
    
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    // Fill password form
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword' } });
    
    // Submit form
    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);
    
    await waitFor(() => {
      expect(mockSettingsContext.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      });
    });
  });

  it('validates password form before submission', async () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    // Try to submit without filling required fields
    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);
    
    expect(mockSettingsContext.changePassword).not.toHaveBeenCalled();
    expect(screen.getByText('Current password is required')).toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    
    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);
    
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    expect(currentPasswordInput).toHaveAttribute('type', 'password');
    
    const toggleButton = currentPasswordInput.parentElement?.querySelector('button');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(currentPasswordInput).toHaveAttribute('type', 'text');
    }
  });

  it('renders preferences tab content', () => {
    const preferencesContext = { ...mockSettingsContext, activeTab: 'preferences' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={preferencesContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('handles theme selection', async () => {
    mockSettingsContext.updateSettings.mockResolvedValue(true);
    const preferencesContext = { ...mockSettingsContext, activeTab: 'preferences' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={preferencesContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    const darkThemeButton = screen.getByText('Dark');
    fireEvent.click(darkThemeButton);
    
    expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('handles notification settings toggle', async () => {
    mockSettingsContext.updateSettings.mockResolvedValue(true);
    const preferencesContext = { ...mockSettingsContext, activeTab: 'preferences' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={preferencesContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    const notificationCheckbox = screen.getByLabelText('Enable desktop notifications');
    fireEvent.click(notificationCheckbox);
    
    expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({ notifications: false });
  });

  it('renders privacy tab content', () => {
    const privacyContext = { ...mockSettingsContext, activeTab: 'privacy' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={privacyContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Show online status to other users')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('handles privacy settings toggle', async () => {
    mockSettingsContext.updateSettings.mockResolvedValue(true);
    const privacyContext = { ...mockSettingsContext, activeTab: 'privacy' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={privacyContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    const onlineStatusCheckbox = screen.getByLabelText('Show online status to other users');
    fireEvent.click(onlineStatusCheckbox);
    
    expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({ showOnlineStatus: false });
  });

  it('displays error message when present', () => {
    const errorContext = { ...mockSettingsContext, error: 'Failed to update settings' };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={errorContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
  });

  it('clears form data when modal closes', () => {
    const { rerender } = renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    // Fill password form
    const currentPasswordInput = screen.getByLabelText('Current Password');
    fireEvent.change(currentPasswordInput, { target: { value: 'password' } });
    
    // Close modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={mockSettingsContext}>
          <SettingsModal isOpen={false} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    // Reopen modal
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsContext.Provider value={mockSettingsContext}>
          <SettingsModal isOpen={true} onClose={vi.fn()} />
        </SettingsContext.Provider>
      </AuthContext.Provider>
    );
    
    const reopenedInput = screen.getByLabelText('Current Password');
    expect(reopenedInput).toHaveValue('');
  });

  it('disables change password button when form is incomplete', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    const changePasswordButton = screen.getByText('Change Password');
    expect(changePasswordButton).toBeDisabled();
    
    // Fill only current password
    const currentPasswordInput = screen.getByLabelText('Current Password');
    fireEvent.change(currentPasswordInput, { target: { value: 'password' } });
    
    expect(changePasswordButton).toBeDisabled();
  });

  it('enables change password button when form is complete', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword' } });
    
    const changePasswordButton = screen.getByText('Change Password');
    expect(changePasswordButton).not.toBeDisabled();
  });
});