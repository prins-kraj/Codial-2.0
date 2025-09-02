import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/config/constants';
import { 
  ApiResponse, 
  DirectConversation, 
  DirectMessage, 
  SendDirectMessageRequest,
  EditMessageRequest,
  UserProfile,
  UpdateProfileRequest,
  UserSettings,
  UpdateSettingsRequest,
  ChangePasswordRequest,
  Message,
  User
} from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  error => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API utility functions
export class ApiClient {
  // Generic GET request
  static async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return this.handleError<T>(error);
    }
  }

  // Generic POST request
  static async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      return this.handleError<T>(error);
    }
  }

  // Generic PUT request
  static async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      return this.handleError<T>(error);
    }
  }

  // Generic DELETE request
  static async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return this.handleError<T>(error);
    }
  }

  // Error handler
  private static handleError<T>(error: any): ApiResponse<T> {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error:
          error.response.data?.error ||
          error.response.data?.message ||
          'Server error',
        details: error.response.data?.details,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        error: 'Network error - please check your connection',
      };
    } else {
      // Something else happened
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Set auth token
  static setAuthToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  // Clear auth token
  static clearAuthToken(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // Get auth token
  static getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAuthToken();
    return !!token;
  }

  // Direct Messages API methods
  static async getDirectMessageConversations(): Promise<ApiResponse<DirectConversation[]>> {
    return this.get<DirectConversation[]>('/api/direct-messages');
  }

  static async getDirectMessages(userId: string): Promise<ApiResponse<DirectMessage[]>> {
    return this.get<DirectMessage[]>(`/api/direct-messages/${userId}`);
  }

  static async sendDirectMessage(data: SendDirectMessageRequest): Promise<ApiResponse<DirectMessage>> {
    return this.post<DirectMessage>('/api/direct-messages', data);
  }

  static async editDirectMessage(messageId: string, data: EditMessageRequest): Promise<ApiResponse<DirectMessage>> {
    return this.put<DirectMessage>(`/api/direct-messages/${messageId}`, data);
  }

  static async deleteDirectMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/direct-messages/${messageId}`);
  }

  static async searchDirectMessages(query: string): Promise<ApiResponse<DirectMessage[]>> {
    return this.get<DirectMessage[]>(`/api/direct-messages/search/messages?q=${encodeURIComponent(query)}`);
  }

  static async markDirectMessagesAsRead(userId: string): Promise<ApiResponse<void>> {
    return this.put<void>(`/api/direct-messages/${userId}/read`, {});
  }

  // User Profile API methods
  static async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(`/api/users/${userId}/profile`);
  }

  static async updateUserProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/api/users/me/profile', data);
  }

  static async uploadProfilePicture(file: File): Promise<ApiResponse<{ profilePicture: string }>> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    return this.post<{ profilePicture: string }>('/api/users/me/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Settings API methods
  static async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    return this.get<UserSettings>('/api/users/me/settings');
  }

  static async updateUserSettings(data: UpdateSettingsRequest): Promise<ApiResponse<UserSettings>> {
    return this.put<UserSettings>('/api/users/me/settings', data);
  }

  static async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return this.put<void>('/api/users/me/password', data);
  }

  // Message Management API methods
  static async editMessage(messageId: string, data: EditMessageRequest): Promise<ApiResponse<Message>> {
    return this.put<Message>(`/api/messages/${messageId}`, data);
  }

  static async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/messages/${messageId}`);
  }

  // User Search API methods
  static async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return this.get<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
  }
}

export default api;
