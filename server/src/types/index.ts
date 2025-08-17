import { User, Room, Message, UserRoom, UserStatus } from '@prisma/client';

// Database model types
export type { User, Room, Message, UserRoom, UserStatus };

// Extended types with relations
export interface UserWithRooms extends User {
  userRooms: (UserRoom & {
    room: Room;
  })[];
}

export interface RoomWithUsers extends Room {
  userRooms: (UserRoom & {
    user: User;
  })[];
  messages: Message[];
}

export interface MessageWithUser extends Message {
  user: {
    id: string;
    username: string;
  };
}

// API Request/Response types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    status: UserStatus;
  };
  token: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface SendMessageRequest {
  content: string;
  roomId: string;
}

// Socket.io event types
export interface ServerToClientEvents {
  message_received: (data: MessageWithUser) => void;
  message_updated: (data: MessageWithUser) => void;
  message_deleted: (data: { messageId: string; roomId: string }) => void;
  user_joined: (data: { userId: string; username: string; roomId: string }) => void;
  user_left: (data: { userId: string; username: string; roomId: string }) => void;
  typing_indicator: (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => void;
  user_status_changed: (data: { userId: string; status: UserStatus }) => void;
  room_created: (data: Room) => void;
  error: (data: { message: string; code?: string }) => void;
  pong: () => void;
}

export interface ClientToServerEvents {
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: SendMessageRequest) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  ping: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
}

// Utility types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface MessageHistoryQuery extends PaginationQuery {
  before?: string; // cursor-based pagination
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}