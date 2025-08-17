// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  // Users
  USERS: {
    ONLINE: '/api/users/online',
    PROFILE: (userId: string) => `/api/users/${userId}`,
    UPDATE_PROFILE: '/api/users/me/profile',
    UPDATE_STATUS: '/api/users/me/status',
    MY_ROOMS: '/api/users/me/profile',
  },
  // Rooms
  ROOMS: {
    LIST: '/api/rooms',
    CREATE: '/api/rooms',
    DETAILS: (roomId: string) => `/api/rooms/${roomId}`,
    JOIN: (roomId: string) => `/api/rooms/${roomId}/join`,
    LEAVE: (roomId: string) => `/api/rooms/${roomId}/leave`,
    MESSAGES: (roomId: string) => `/api/rooms/${roomId}/messages`,
    MEMBERS: (roomId: string) => `/api/rooms/${roomId}/members`,
  },
  // Messages
  MESSAGES: {
    SEND: '/api/messages',
    SEARCH: '/api/messages/search',
    DETAILS: (messageId: string) => `/api/messages/${messageId}`,
    EDIT: (messageId: string) => `/api/messages/${messageId}`,
    DELETE: (messageId: string) => `/api/messages/${messageId}`,
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'chat_auth_token',
  USER_DATA: 'chat_user_data',
  THEME: 'chat_theme',
  LAST_ROOM: 'chat_last_room',
} as const;

// UI Constants
export const UI_CONSTANTS = {
  // Message limits
  MAX_MESSAGE_LENGTH: 1000,
  MESSAGE_LOAD_LIMIT: 50,
  
  // Typing indicator timeout
  TYPING_TIMEOUT: 3000,
  
  // Connection retry
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  TYPING_DEBOUNCE: 1000,
  
  // Animation durations
  TOAST_DURATION: 5000,
  FADE_DURATION: 200,
  
  // Breakpoints (matching Tailwind)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
  },
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Room management
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  
  // Messaging
  SEND_MESSAGE: 'send_message',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  
  // Typing indicators
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  TYPING_INDICATOR: 'typing_indicator',
  
  // User presence
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_STATUS_CHANGED: 'user_status_changed',
  
  // Room events
  ROOM_CREATED: 'room_created',
  
  // Error handling
  ERROR: 'error',
  
  // Heartbeat
  PING: 'ping',
  PONG: 'pong',
} as const;

// User Status Colors
export const STATUS_COLORS = {
  ONLINE: 'bg-green-500',
  AWAY: 'bg-yellow-500',
  OFFLINE: 'bg-gray-400',
} as const;

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
} as const;

// Validation Rules
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  ROOM_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s\-_#]+$/,
  },
  MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
  },
} as const;