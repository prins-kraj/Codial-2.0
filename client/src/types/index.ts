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
  bio?: string;
  profilePicture?: string;
}

export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

// User Profile types
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  status: UserStatus;
  createdAt: string;
  lastSeen: string;
}

export interface UpdateProfileRequest {
  bio?: string;
  profilePicture?: string;
}

// User Settings types
export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  showOnlineStatus: boolean;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  soundEnabled?: boolean;
  emailNotifications?: boolean;
  showOnlineStatus?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

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
  isDeleted: boolean;
  editHistory?: MessageEditHistory[];
  user: {
    id: string;
    username: string;
  };
}

export interface MessageEditHistory {
  content: string;
  editedAt: string;
}

export interface EditMessageRequest {
  content: string;
}

// Direct Message types
export interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  isDeleted: boolean;
  sender: User;
  receiver: User;
}

export interface DirectConversation {
  participantId: string;
  participant: User;
  lastMessage?: DirectMessage;
  unreadCount: number;
  lastActivity: string;
}

export interface SendDirectMessageRequest {
  receiverId: string;
  content: string;
}

export interface SendMessageRequest {
  content: string;
  roomId: string;
}

// Additional API Response types
export interface DirectConversationsResponse {
  conversations: DirectConversation[];
}

export interface DirectMessagesResponse {
  messages: DirectMessage[];
  pagination?: PaginationInfo;
}

export interface ProfilePictureUploadResponse {
  profilePicture: string;
}

export interface UserSearchResponse {
  users: User[];
}

// Socket.io event types
export interface ServerToClientEvents {
  message_received: (data: Message) => void;
  message_updated: (data: Message) => void;
  message_deleted: (data: { messageId: string; roomId: string }) => void;
  message_edited: (data: Message) => void;
  user_joined: (data: { userId: string; username: string; roomId: string }) => void;
  user_left: (data: { userId: string; username: string; roomId: string }) => void;
  typing_indicator: (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => void;
  user_status_changed: (data: { userId: string; status: UserStatus }) => void;
  user_profile_updated: (data: UserProfile) => void;
  room_created: (data: Room) => void;
  direct_message_sent: (data: DirectMessage) => void;
  direct_message_received: (data: DirectMessage) => void;
  direct_message_edited: (data: DirectMessage) => void;
  direct_message_deleted: (data: { messageId: string; conversationId: string }) => void;
  error: (data: { message: string; code?: string }) => void;
  pong: () => void;
}

export interface ClientToServerEvents {
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: SendMessageRequest) => void;
  send_direct_message: (data: SendDirectMessageRequest) => void;
  edit_message: (data: { messageId: string; content: string }) => void;
  delete_message: (data: { messageId: string }) => void;
  edit_direct_message: (data: { messageId: string; content: string }) => void;
  delete_direct_message: (data: { messageId: string }) => void;
  join_direct_conversation: (partnerId: string) => void;
  leave_direct_conversation: (partnerId: string) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  update_user_status: (data: { status: string }) => void;
  user_profile_updated: (data: UserProfile) => void;
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

export interface DirectMessagesState {
  conversations: DirectConversation[];
  activeConversation: string | null;
  messages: Record<string, DirectMessage[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
}

export interface UserProfileState {
  profiles: Record<string, UserProfile>;
  currentProfile: UserProfile | null;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SettingsState {
  settings: UserSettings | null;
  isOpen: boolean;
  activeTab: string;
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