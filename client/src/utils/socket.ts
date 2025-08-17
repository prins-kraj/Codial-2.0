import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS, UI_CONSTANTS } from '@/config/constants';
import { ClientToServerEvents, ServerToClientEvents } from '@/types';
import { ApiClient } from './api';

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketManager {
  private socket: ChatSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = UI_CONSTANTS.MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = UI_CONSTANTS.RECONNECT_DELAY;
  private isConnecting = false;

  // Initialize socket connection
  connect(): Promise<ChatSocket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(this.socket);
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      const token = ApiClient.getAuthToken();
      if (!token) {
        reject(new Error('No authentication token found'));
        return;
      }

      this.isConnecting = true;

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
      });

      this.socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('✅ Socket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, error => {
        console.error('❌ Socket connection error:', error);
        this.isConnecting = false;

        if (error.message.includes('Authentication')) {
          // Auth error - don't retry
          reject(new Error('Authentication failed'));
        } else {
          // Network error - attempt reconnection
          this.handleReconnection();
          reject(error);
        }
      });

      this.socket.on(SOCKET_EVENTS.DISCONNECT, reason => {
        console.log('🔌 Socket disconnected:', reason);
        this.isConnecting = false;

        if (reason === 'io server disconnect') {
          // Server disconnected - don't reconnect automatically
          return;
        }

        // Attempt reconnection for other disconnect reasons
        this.handleReconnection();
      });

      this.socket.on(SOCKET_EVENTS.ERROR, error => {
        console.error('Socket error:', error);
      });

      // Setup heartbeat
      this.setupHeartbeat();
    });
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  // Get current socket instance
  getSocket(): ChatSocket | null {
    return this.socket;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Handle reconnection logic
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Setup heartbeat to detect connection issues
  private setupHeartbeat(): void {
    if (!this.socket) return;

    const heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(SOCKET_EVENTS.PING);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Send ping every 30 seconds

    this.socket.on(SOCKET_EVENTS.PONG, () => {
      // Connection is alive
    });
  }

  // Room management methods
  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_ROOM, roomId);
    }
  }

  // Messaging methods
  sendMessage(roomId: string, content: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { roomId, content });
    }
  }

  // Typing indicator methods
  startTyping(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.TYPING_START, roomId);
    }
  }

  stopTyping(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.TYPING_STOP, roomId);
    }
  }

  // Event listener helpers
  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void {
    this.socket?.on(event as any, listener as any);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ): void {
    this.socket?.off(event as any, listener as any);
  }

  // Remove all listeners for an event
  removeAllListeners(event?: keyof ServerToClientEvents): void {
    if (event) {
      this.socket?.removeAllListeners(event as any);
    } else {
      this.socket?.removeAllListeners();
    }
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;
