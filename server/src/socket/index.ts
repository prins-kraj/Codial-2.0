import { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware } from './auth';
import { SocketHandlers } from './handlers';
import { DirectMessageHandlers } from './directMessageHandlers';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types';

export function initializeSocket(
  io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', socket => {
    const socketData = socket.data as SocketData;
    console.log(`✅ User ${socketData.username} connected (${socket.id})`);

    // Room management events
    socket.on('join_room', (roomId: string) => {
      SocketHandlers.handleJoinRoom(socket, roomId);
    });

    socket.on('leave_room', (roomId: string) => {
      SocketHandlers.handleLeaveRoom(socket, roomId);
    });

    // Messaging events
    socket.on('send_message', data => {
      SocketHandlers.handleSendMessage(socket, data);
    });

    socket.on('edit_message', data => {
      SocketHandlers.handleEditMessage(socket, data);
    });

    socket.on('delete_message', data => {
      SocketHandlers.handleDeleteMessage(socket, data);
    });

    // Direct messaging events
    socket.on('send_direct_message', data => {
      DirectMessageHandlers.handleSendDirectMessage(socket, data);
    });

    socket.on('edit_direct_message', data => {
      DirectMessageHandlers.handleEditDirectMessage(socket, data);
    });

    socket.on('delete_direct_message', data => {
      DirectMessageHandlers.handleDeleteDirectMessage(socket, data);
    });

    socket.on('join_direct_conversation', (partnerId: string) => {
      DirectMessageHandlers.handleJoinDirectConversation(socket, partnerId);
    });

    socket.on('leave_direct_conversation', (partnerId: string) => {
      DirectMessageHandlers.handleLeaveDirectConversation(socket, partnerId);
    });

    // User status events
    socket.on('update_user_status', data => {
      SocketHandlers.handleUpdateUserStatus(socket, data);
    });

    // Typing indicator events
    socket.on('typing_start', (roomId: string) => {
      SocketHandlers.handleTypingStart(socket, roomId);
    });

    socket.on('typing_stop', (roomId: string) => {
      SocketHandlers.handleTypingStop(socket, roomId);
    });

    // Connection management events
    socket.on('disconnect', reason => {
      SocketHandlers.handleDisconnect(socket, reason);
    });

    // socket.on('connect_error', (error) => {
    //   SocketHandlers.handleConnectError(socket, error);
    // });

    // Heartbeat for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  // Global error handler
  io.engine.on('connection_error', err => {
    console.error('Socket.io connection error:', {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type,
    });
  });

  console.log('🔌 Socket.io server initialized');
}
