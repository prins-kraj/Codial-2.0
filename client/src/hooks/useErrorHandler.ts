import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationUtils } from '@/utils/notifications';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  redirectOnAuth?: boolean;
}

export const useErrorHandler = () => {
  const { logout } = useAuth();

  const handleError = useCallback((
    error: any,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      redirectOnAuth = true,
    } = options;

    // Log error for debugging
    if (logError) {
      console.error('Error handled:', error);
    }

    // Handle different types of errors
    if (error?.response?.status === 401) {
      // Authentication error
      if (showToast) {
        NotificationUtils.authError();
      }
      if (redirectOnAuth) {
        logout();
      }
      return;
    }

    if (error?.response?.status === 403) {
      // Permission error
      if (showToast) {
        NotificationUtils.error('You do not have permission to perform this action.');
      }
      return;
    }

    if (error?.response?.status >= 500) {
      // Server error
      if (showToast) {
        NotificationUtils.serverError(error?.response?.data?.message);
      }
      return;
    }

    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network')) {
      // Network error
      if (showToast) {
        NotificationUtils.networkError();
      }
      return;
    }

    if (error?.response?.status === 400) {
      // Validation error
      const message = error?.response?.data?.message || 'Invalid request';
      if (showToast) {
        NotificationUtils.validationError(message);
      }
      return;
    }

    // Generic error
    const message = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
    if (showToast) {
      NotificationUtils.error(message);
    }
  }, [logout]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw so caller can handle if needed
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
};

export default useErrorHandler;