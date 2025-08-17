import { vi } from 'vitest';
import { socketManager } from '@/utils/socket';
import { ApiClient } from '@/utils/api';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  })),
}));

// Mock API client
vi.mock('@/utils/api', () => ({
  ApiClient: {
    getAuthToken: vi.fn(),
  },
}));

describe('SocketManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ApiClient.getAuthToken as any).mockReturnValue('mock-token');
  });

  describe('connect', () => {
    it('should connect successfully with valid token', async () => {
      const socket = await socketManager.connect();
      expect(socket).toBeDefined();
      expect(socketManager.isConnected()).toBe(true);
    });

    it('should reject connection without token', async () => {
      (ApiClient.getAuthToken as any).mockReturnValue(null);
      
      await expect(socketManager.connect()).rejects.toThrow('No authentication token found');
    });

    it('should return existing connection if already connected', async () => {
      const socket1 = await socketManager.connect();
      const socket2 = await socketManager.connect();
      
      expect(socket1).toBe(socket2);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', async () => {
      await socketManager.connect();
      socketManager.disconnect();
      
      expect(socketManager.isConnected()).toBe(false);
    });
  });

  describe('room management', () => {
    beforeEach(async () => {
      await socketManager.connect();
    });

    it('should join room', () => {
      const roomId = 'test-room';
      socketManager.joinRoom(roomId);
      
      const socket = socketManager.getSocket();
      expect(socket?.emit).toHaveBeenCalledWith('join_room', roomId);
    });

    it('should leave room', () => {
      const roomId = 'test-room';
      socketManager.leaveRoom(roomId);
      
      const socket = socketManager.getSocket();
      expect(socket?.emit).toHaveBeenCalledWith('leave_room', roomId);
    });
  });

  describe('messaging', () => {
    beforeEach(async () => {
      await socketManager.connect();
    });

    it('should send message', () => {
      const roomId = 'test-room';
      const content = 'Hello world!';
      
      socketManager.sendMessage(roomId, content);
      
      const socket = socketManager.getSocket();
      expect(socket?.emit).toHaveBeenCalledWith('send_message', { roomId, content });
    });

    it('should start typing', () => {
      const roomId = 'test-room';
      socketManager.startTyping(roomId);
      
      const socket = socketManager.getSocket();
      expect(socket?.emit).toHaveBeenCalledWith('typing_start', roomId);
    });

    it('should stop typing', () => {
      const roomId = 'test-room';
      socketManager.stopTyping(roomId);
      
      const socket = socketManager.getSocket();
      expect(socket?.emit).toHaveBeenCalledWith('typing_stop', roomId);
    });
  });

  describe('event listeners', () => {
    beforeEach(async () => {
      await socketManager.connect();
    });

    it('should add event listener', () => {
      const listener = vi.fn();
      socketManager.on('message_received', listener);
      
      const socket = socketManager.getSocket();
      expect(socket?.on).toHaveBeenCalledWith('message_received', listener);
    });

    it('should remove event listener', () => {
      const listener = vi.fn();
      socketManager.off('message_received', listener);
      
      const socket = socketManager.getSocket();
      expect(socket?.off).toHaveBeenCalledWith('message_received', listener);
    });

    it('should remove all listeners', () => {
      socketManager.removeAllListeners();
      
      const socket = socketManager.getSocket();
      expect(socket?.removeAllListeners).toHaveBeenCalled();
    });
  });
});