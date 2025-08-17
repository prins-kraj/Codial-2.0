// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  lastSeen: string;
}

export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

// Authentication types
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Room types
export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    username: string;
  };
  memberCount: number;
  messageCount: number;
  members: RoomMember[];
  isJoined: boolean;
}

export interface RoomMember {
  id: string;
  username: string;
  status: UserStatus;
  joinedAt: string;
  lastReadAt?: string;
  lastSeen?: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

// Message types
export interface Message {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  user: {
    id: string;
    username: string;
  };
}

export interface SendMessageRequest {
  content: string;
  roomId: string;
}

// Socket.io event types
export interface ServerToClientEvents {
  message_received: (data: Message) => void;
  message_updated: (data: Message) => void;
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

// UI State types
export interface ChatState {
  currentRoom: Room | null;
  rooms: Room[];
  messages: Record<string, Message[]>;
  onlineUsers: User[];
  typingUsers: Record<string, string[]>; // roomId -> usernames
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Form types
export interface FormErrors {
  [key: string]: string | undefined;
}

// Pagination types
export interface PaginationInfo {
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MessageHistory {
  messages: Message[];
  pagination: PaginationInfo;
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}