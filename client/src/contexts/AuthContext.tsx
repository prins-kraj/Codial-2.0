import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, AuthUser, LoginRequest, RegisterRequest } from '@/types';
import { ApiClient } from '@/utils/api';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/config/constants';
import { HelperUtils } from '@/utils/helpers';

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Auth context
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        try {
          const user = HelperUtils.parseJSON<AuthUser>(userData, null as any);
          if (user) {
            ApiClient.setAuthToken(token);
            dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });

            // Verify token is still valid
            await refreshUser();
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          logout();
        }
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginRequest): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await ApiClient.post(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      if (response.success && response.data) {
        const authData = response.data as { user: AuthUser; token: string };
        const { user, token } = authData;

        // Store auth data
        ApiClient.setAuthToken(token);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
        return true;
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: response.error || 'Login failed',
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Login failed',
      });
      return false;
    }
  };

  // Register function
  const register = async (userData: RegisterRequest): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await ApiClient.post(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );

      if (response.success && response.data) {
        const authData = response.data as { user: AuthUser; token: string };
        const { user, token } = authData;

        // Store auth data
        ApiClient.setAuthToken(token);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
        return true;
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: response.error || 'Registration failed',
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Registration failed',
      });
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if authenticated
      if (state.isAuthenticated) {
        await ApiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      ApiClient.clearAuthToken();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await ApiClient.get(API_ENDPOINTS.AUTH.ME);

      if (response.success && response.data) {
        const updatedUser = response.data as AuthUser;
        localStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(updatedUser)
        );

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: updatedUser, token: state.token || '' },
        });
      } else {
        // Token might be invalid
        logout();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
