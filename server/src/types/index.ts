import { User, Room, Message, UserRoom, UserStatus, UserSettings } from '@prisma/client';

// Database model types
export type { User, Room, Message, UserRoom, UserStatus, UserSettings };

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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  status: UserStatus;
  createdAt: Date;
  lastSeen: Date;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
}

export interface UpdateStatusRequest {
  status: UserStatus;
}

export interface UpdateSettingsRequest {
  theme?: string;
  notifications?: boolean;
  soundEnabled?: boolean;
  emailNotifications?: boolean;
  showOnlineStatus?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
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
  message_edited: (data: MessageWithUser) => void;
  message_deleted: (data: { messageId: string; roomId: string; senderId: string }) => void;
  user_joined: (data: { userId: string; username: string; roomId: string }) => void;
  user_left: (data: { userId: string; username: string; roomId: string }) => void;
  typing_indicator: (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => void;
  user_status_changed: (data: { userId: string; status: UserStatus }) => void;
  user_profile_updated: (data: { userId: string; profile: UserProfile }) => void;
  user_settings_changed: (data: { userId: string; settings: UserSettings }) => void;
  room_created: (data: Room) => void;
  direct_message_sent: (data: any) => void;
  direct_message_received: (data: any) => void;
  direct_message_edited: (data: any) => void;
  direct_message_deleted: (data: { messageId: string; senderId: string; receiverId: string }) => void;
  error: (data: { message: string; code?: string }) => void;
  pong: () => void;
}

export interface ClientToServerEvents {
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: SendMessageRequest) => void;
  edit_message: (data: { messageId: string; content: string }) => void;
  delete_message: (data: { messageId: string }) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  send_direct_message: (data: { content: string; receiverId: string }) => void;
  edit_direct_message: (data: { messageId: string; content: string }) => void;
  delete_direct_message: (data: { messageId: string }) => void;
  join_direct_conversation: (partnerId: string) => void;
  leave_direct_conversation: (partnerId: string) => void;
  update_user_status: (data: { status: UserStatus }) => void;
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