import toast from 'react-hot-toast';

export class NotificationUtils {
  // Success notifications
  static success(message: string, options?: { duration?: number }) {
    return toast.success(message, {
      duration: options?.duration || 3000,
      iconTheme: {
        primary: '#10b981',
        secondary: '#fff',
      },
    });
  }

  // Error notifications
  static error(message: string, options?: { duration?: number; persistent?: boolean }) {
    return toast.error(message, {
      duration: options?.persistent ? Infinity : (options?.duration || 5000),
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
    });
  }

  // Warning notifications
  static warning(message: string, options?: { duration?: number }) {
    return toast(message, {
      duration: options?.duration || 4000,
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
  }

  // Info notifications
  static info(message: string, options?: { duration?: number }) {
    return toast(message, {
      duration: options?.duration || 4000,
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
    });
  }

  // Loading notifications
  static loading(message: string) {
    return toast.loading(message, {
      style: {
        background: '#6b7280',
        color: '#fff',
      },
    });
  }

  // Dismiss specific toast
  static dismiss(toastId: string) {
    toast.dismiss(toastId);
  }

  // Dismiss all toasts
  static dismissAll() {
    toast.dismiss();
  }

  // Promise-based notifications
  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) {
    return toast.promise(promise, messages, {
      success: {
        duration: 3000,
        iconTheme: {
          primary: '#10b981',
          secondary: '#fff',
        },
      },
      error: {
        duration: 5000,
        iconTheme: {
          primary: '#ef4444',
          secondary: '#fff',
        },
      },
    });
  }

  // Network error notification
  static networkError() {
    return this.error('Network error. Please check your connection and try again.', {
      persistent: true,
    });
  }

  // Authentication error notification
  static authError() {
    return this.error('Your session has expired. Please log in again.', {
      persistent: true,
    });
  }

  // Server error notification
  static serverError(message?: string) {
    return this.error(message || 'Server error. Please try again later.', {
      duration: 5000,
    });
  }

  // Validation error notification
  static validationError(message: string) {
    return this.warning(message, {
      duration: 4000,
    });
  }
}

export default NotificationUtils;