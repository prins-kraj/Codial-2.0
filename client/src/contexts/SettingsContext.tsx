import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { SettingsState, UserSettings, UpdateSettingsRequest, ChangePasswordRequest } from '@/types';
import { ApiClient } from '@/utils/api';
import { STORAGE_KEYS } from '@/config/constants';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Settings actions
type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: UserSettings }
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'CLEAR_SETTINGS' };

// Settings reducer
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: state.settings ? { ...state.settings, ...action.payload } : null,
      };
    case 'CLEAR_SETTINGS':
      return {
        ...state,
        settings: null,
        isOpen: false,
        activeTab: 'account',
      };
    default:
      return state;
  }
}

// Initial state
const initialState: SettingsState = {
  settings: null,
  isOpen: false,
  activeTab: 'account',
  isLoading: false,
  error: null,
};

// Settings context
interface SettingsContextType extends SettingsState {
  // Settings management
  loadSettings: () => Promise<void>;
  updateSettings: (data: UpdateSettingsRequest) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
  
  // UI state management
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
  setActiveTab: (tab: string) => void;
  
  // Theme management
  applyTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Utility
  clearError: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Settings provider
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Load settings when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSettings();
    } else {
      dispatch({ type: 'CLEAR_SETTINGS' });
    }
  }, [isAuthenticated, user]);

  // Apply theme when settings change
  useEffect(() => {
    if (state.settings?.theme) {
      applyTheme(state.settings.theme);
    }
  }, [state.settings?.theme]);

  // Load user settings
  const loadSettings = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.getUserSettings();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_SETTINGS', payload: response.data });
        
        // Store theme preference in localStorage
        localStorage.setItem(STORAGE_KEYS.THEME, response.data.theme);
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load settings' });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load settings' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user settings
  const updateSettings = async (data: UpdateSettingsRequest): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to update settings');
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.updateUserSettings(data);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_SETTINGS', payload: response.data });
        
        // Update localStorage for theme
        if (data.theme) {
          localStorage.setItem(STORAGE_KEYS.THEME, data.theme);
        }
        
        toast.success('Settings updated successfully');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to update settings' });
        toast.error(response.error || 'Failed to update settings');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update settings';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Change password
  const changePassword = async (data: ChangePasswordRequest): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to change your password');
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.changePassword(data);
      
      if (response.success) {
        toast.success('Password changed successfully');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to change password' });
        toast.error(response.error || 'Failed to change password');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to change password';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Open settings modal
  const openSettings = (tab: string = 'account') => {
    dispatch({ type: 'SET_OPEN', payload: true });
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  // Close settings modal
  const closeSettings = () => {
    dispatch({ type: 'SET_OPEN', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Set active tab
  const setActiveTab = (tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  // Apply theme to document
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      // Use explicit theme
      root.classList.toggle('dark', theme === 'dark');
    }
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  };

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      // Default to system preference
      applyTheme('system');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (currentTheme === 'system' || !currentTheme) {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: SettingsContextType = {
    ...state,
    loadSettings,
    updateSettings,
    changePassword,
    openSettings,
    closeSettings,
    setActiveTab,
    applyTheme,
    clearError,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use settings context
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}