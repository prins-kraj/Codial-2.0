import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { AuthContext } from '@/contexts/AuthContext';
import { ApiClient } from '@/utils/api';
import { UserSettings, User } from '@/types';

// Mock API client
vi.mock('@/utils/api', () => ({
  ApiClient: {
    getUserSettings: vi.fn(),
    updateUserSettings: vi.fn(),
    changePassword: vi.fn()
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
    <SettingsProvider>
      {children}
    </SettingsProvider>
  </AuthContext.Provider>
);

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial state', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings).toBeNull();
    expect(result.current.activeTab).toBe('account');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads settings successfully', async () => {
    vi.mocked(ApiClient.getUserSettings).mockResolvedValue({
      success: true,
      data: mockSettings
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    // Settings should be loaded automatically when user is available
    await act(async () => {
      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(ApiClient.getUserSettings).toHaveBeenCalled();
  });

  it('handles settings loading error', async () => {
    vi.mocked(ApiClient.getUserSettings).mockResolvedValue({
      success: false,
      error: 'Failed to load settings'
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Failed to load settings');
  });

  it('updates settings successfully', async () => {
    vi.mocked(ApiClient.getUserSettings).mockResolvedValue({
      success: true,
      data: mockSettings
    });

    vi.mocked(ApiClient.updateUserSettings).mockResolvedValue({
      success: true,
      data: { ...mockSettings, theme: 'dark' }
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const success = await act(async () => {
      return await result.current.updateSettings({ theme: 'dark' });
    });

    expect(success).toBe(true);
    expect(result.current.settings?.theme).toBe('dark');
    expect(ApiClient.updateUserSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('handles settings update error', async () => {
    vi.mocked(ApiClient.getUserSettings).mockResolvedValue({
      success: true,
      data: mockSettings
    });

    vi.mocked(ApiClient.updateUserSettings).mockResolvedValue({
      success: false,
      error: 'Failed to update settings'
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const success = await act(async () => {
      return await result.current.updateSettings({ theme: 'dark' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to update settings');
  });

  it('changes password successfully', async () => {
    vi.mocked(ApiClient.changePassword).mockResolvedValue({
      success: true
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    const success = await act(async () => {
      return await result.current.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass'
      });
    });

    expect(success).toBe(true);
    expect(ApiClient.changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpass',
      newPassword: 'newpass'
    });
  });

  it('handles password change error', async () => {
    vi.mocked(ApiClient.changePassword).mockResolvedValue({
      success: false,
      error: 'Invalid current password'
    });

    const { result } = renderHook(() => useSettings(), { wrapper });

    const success = await act(async () => {
      return await result.current.changePassword({
        currentPassword: 'wrongpass',
        newPassword: 'newpass'
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Invalid current password');
  });

  it('sets active tab', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.setActiveTab('preferences');
    });

    expect(result.current.activeTab).toBe('preferences');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useSettings());
    }).toThrow('useSettings must be used within a SettingsProvider');
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(ApiClient.getUserSettings).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Network error');
  });

  it('updates loading state during operations', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    vi.mocked(ApiClient.updateUserSettings).mockReturnValue(promise);

    const { result } = renderHook(() => useSettings(), { wrapper });

    // Start updating
    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });

    expect(result.current.isLoading).toBe(true);

    // Complete updating
    await act(async () => {
      resolvePromise!({ success: true, data: mockSettings });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('does not load settings when user is not authenticated', () => {
    const unauthenticatedContext = { ...mockAuthContext, user: null };

    const unauthenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={unauthenticatedContext}>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </AuthContext.Provider>
    );

    renderHook(() => useSettings(), { wrapper: unauthenticatedWrapper });

    expect(ApiClient.getUserSettings).not.toHaveBeenCalled();
  });
});