import { useEffect, useRef } from 'react';
import { socketManager, ChatSocket } from '@/utils/socket';
import { ServerToClientEvents, ClientToServerEvents } from '@/types';

export function useSocket() {
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await socketManager.connect();
        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    };

    initSocket();

    return () => {
      socketManager.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = <K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ) => {
    socketManager.on(event, listener);
  };

  const off = <K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ) => {
    socketManager.off(event, listener);
  };

  const emit = <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    const socket = socketManager.getSocket();
    if (socket?.connected) {
      socket.emit(event as any, ...args);
    }
  };

  return {
    socket: socketRef.current,
    isConnected: socketManager.isConnected(),
    on,
    off,
    emit,
  };
}
