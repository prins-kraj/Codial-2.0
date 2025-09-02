import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '@/utils/api';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('Direct Messages API', () => {
    it('gets direct conversations successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            conversations: [
              {
                participantId: 'user2',
                participant: { id: 'user2', username: 'testuser' },
                lastMessage: null,
                unreadCount: 0,
                lastActivity: '2023-01-01T00:00:00Z'
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ApiClient.getDirectConversations();

      expect(result.success).toBe(true);
      expect(result.data?.conversations).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/direct-messages', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('gets direct messages for a user successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            messages: [
              {
                id: 'msg1',
                content: 'Hello',
                senderId: 'user1',
                receiverId: 'user2',
                createdAt: '2023-01-01T00:00:00Z'
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ApiClient.getDirectMessages('user2');

      expect(result.success).toBe(true);
      expect(result.data?.messages).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/direct-messages/user2', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('sends direct message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'msg1',
            content: 'Hello',
            senderId: 'user1',
            receiverId: 'user2',
            createdAt: '2023-01-01T00:00:00Z'
          }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const messageData = { receiverId: 'user2', content: 'Hello' };
      const result = await ApiClient.sendDirectMessage(messageData);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello');
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/direct-messages', messageData, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('marks direct messages as read successfully', async () => {
      const mockResponse = {
        data: { success: true }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await ApiClient.markDirectMessagesAsRead('user2');

      expect(result.success).toBe(true);
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/direct-messages/user2/read', {}, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });

  describe('User Profile API', () => {
    it('gets user profile successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'user1',
            username: 'testuser',
            email: 'test@example.com',
            bio: 'Test bio',
            status: 'ONLINE',
            createdAt: '2023-01-01T00:00:00Z',
            lastSeen: '2023-01-01T00:00:00Z'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ApiClient.getUserProfile('user1');

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe('testuser');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/user1/profile', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('updates user profile successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'user1',
            username: 'testuser',
            bio: 'Updated bio'
          }
        }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const profileData = { bio: 'Updated bio' };
      const result = await ApiClient.updateUserProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.data?.bio).toBe('Updated bio');
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/users/me/profile', profileData, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('uploads profile picture successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { profilePicture: 'https://example.com/avatar.jpg' }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const mockFile = new File([''], 'avatar.jpg', { type: 'image/jpeg' });
      const result = await ApiClient.uploadProfilePicture(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.profilePicture).toBe('https://example.com/avatar.jpg');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/users/me/profile/picture',
        expect.any(FormData),
        {
          headers: {
            Authorization: 'Bearer mock-token',
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    });
  });

  describe('User Settings API', () => {
    it('gets user settings successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'settings1',
            userId: 'user1',
            theme: 'light',
            notifications: true,
            soundEnabled: true,
            emailNotifications: true,
            showOnlineStatus: true
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ApiClient.getUserSettings();

      expect(result.success).toBe(true);
      expect(result.data?.theme).toBe('light');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/me/settings', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('updates user settings successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'settings1',
            theme: 'dark',
            notifications: false
          }
        }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const settingsData = { theme: 'dark', notifications: false };
      const result = await ApiClient.updateUserSettings(settingsData);

      expect(result.success).toBe(true);
      expect(result.data?.theme).toBe('dark');
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/users/me/settings', settingsData, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('changes password successfully', async () => {
      const mockResponse = {
        data: { success: true }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const passwordData = { currentPassword: 'old', newPassword: 'new' };
      const result = await ApiClient.changePassword(passwordData);

      expect(result.success).toBe(true);
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/users/me/password', passwordData, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });

  describe('User Search API', () => {
    it('searches users successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: 'user1',
              username: 'testuser',
              email: 'test@example.com',
              status: 'ONLINE'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ApiClient.searchUsers('test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/search', {
        params: { q: 'test' },
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });

  describe('Message Management API', () => {
    it('edits message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'msg1',
            content: 'Updated content',
            editedAt: '2023-01-01T01:00:00Z'
          }
        }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await ApiClient.editMessage('msg1', 'Updated content');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Updated content');
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/messages/msg1', 
        { content: 'Updated content' }, 
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });

    it('deletes message successfully', async () => {
      const mockResponse = {
        data: { success: true }
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await ApiClient.deleteMessage('msg1');

      expect(result.success).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/messages/msg1', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });

    it('edits direct message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'dm1',
            content: 'Updated DM content',
            editedAt: '2023-01-01T01:00:00Z'
          }
        }
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await ApiClient.editDirectMessage('dm1', 'Updated DM content');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Updated DM content');
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/direct-messages/dm1', 
        { content: 'Updated DM content' }, 
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });

    it('deletes direct message successfully', async () => {
      const mockResponse = {
        data: { success: true }
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await ApiClient.deleteDirectMessage('dm1');

      expect(result.success).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/direct-messages/dm1', {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: 'User not found'
          }
        }
      };

      mockedAxios.get.mockRejectedValue(errorResponse);

      const result = await ApiClient.getUserProfile('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('handles network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const result = await ApiClient.getUserProfile('user1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('handles missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await ApiClient.getUserProfile('user1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No authentication token found');
    });

    it('handles malformed response', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      const result = await ApiClient.getUserProfile('user1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format');
    });
  });
});