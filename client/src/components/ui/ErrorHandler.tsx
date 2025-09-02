import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ErrorHandlerProps {
  children: React.ReactNode;
}

// Global error handler for API and network errors
const ErrorHandler: React.FC<ErrorHandlerProps> = ({ children }) => {
  const { logout } = useAuth();

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Check if it's an authentication error
      if (event.reason?.message?.includes('Authentication') || 
          event.reason?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        logout();
        return;
      }
      
      // Check if it's a network error
      if (event.reason?.message?.includes('Network') || 
          event.reason?.code === 'NETWORK_ERROR') {
        toast.error('Network error. Please check your connection.');
        return;
      }
      
      // Generic error handling
      const errorMessage = event.reason?.message || 'An unexpected error occurred';
      toast.error(errorMessage);
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      
      // Don't show toast for chunk loading errors (common in development)
      if (event.error?.message?.includes('Loading chunk')) {
        return;
      }
      
      toast.error('An unexpected error occurred. Please refresh the page.');
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [logout]);

  return <>{children}</>;
};

export default ErrorHandler;