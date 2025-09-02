import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ChatState, Room, Message, User } from '@/types';
import { ApiClient } from '@/utils/api';
import { socketManager } from '@/utils/socket';
import { API_ENDPOINTS, SOCKET_EVENTS } from '@/config/constants';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Chat actions
type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'SET_CURRENT_ROOM'; payload: Room | null }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'UPDATE_ROOM'; payload: Room }
  | { type: 'SET_MESSAGES'; payload: { roomId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'DELETE_MESSAGE'; payload: { messageId: string; roomId: string } }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'SET_TYPING_USERS'; payload: { roomId: string; users: string[] } }
  | { type: 'CLEAR_TYPING_USERS'; payload: string };

// Chat reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: action.payload };
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.payload] };
    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.id ? action.payload : room
        ),
        currentRoom: state.currentRoom?.id === action.payload.id ? action.payload : state.currentRoom,
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      const roomId = action.payload.roomId;
      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: [...(state.messages[roomId] || []), action.payload],
        },
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: (state.messages[action.payload.roomId] || []).map(msg =>
            msg.id === action.payload.id ? action.payload : msg
          ),
        },
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: (state.messages[action.payload.roomId] || []).filter(
            msg => msg.id !== action.payload.messageId
          ),
        },
      };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.roomId]: action.payload.users,
        },
      };
    case 'CLEAR_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload]: [],
        },
      };
    default:
      return state;
  }
}

// Initial state
const initialState: ChatState = {
  currentRoom: null,
  rooms: [],
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  isConnected: false,
  isLoading: false,
  error: null,
};

// Chat context
interface ChatContextType extends ChatState {
  // Room management
  loadRooms: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  createRoom: (name: string, description?: string, isPrivate?: boolean) => Promise<Room | null>;
  
  // Message management
  sendMessage: (content: string) => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  
  // Socket management
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  
  // Typing indicators
  startTyping: () => void;
  stopTyping: () => void;
  
  // Utility
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Chat provider
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
      loadRooms();
      loadOnlineUsers();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  // Socket event handlers
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    // Connection events
    const handleConnect = () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      console.log('✅ Socket connected');
    };

    const handleDisconnect = (reason: string) => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      console.log('🔌 Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        dispatch({ type: 'SET_ERROR', payload: 'Server disconnected' });
      }
    };

    const handleConnectError = (error: Error) => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Connection failed' });
      console.error('❌ Socket connection error:', error);
      toast.error('Failed to connect to chat server');
    };

    // Message events
    const handleMessageReceived = (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      
      // Show notification if not in current room
      if (state.currentRoom?.id !== message.roomId) {
        toast(`New message in ${message.roomId}`, {
          icon: '💬',
          duration: 3000,
        });
      }
    };

    const handleMessageUpdated = (message: Message) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: message });
    };

    const handleMessageEdited = (message: Message) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: message });
    };

    const handleMessageDeleted = (data: { messageId: string; roomId: string }) => {
      dispatch({ type: 'DELETE_MESSAGE', payload: data });
    };

    // Typing events
    const handleTypingIndicator = (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => {
      const currentUsers = state.typingUsers[data.roomId] || [];
      let updatedUsers: string[];

      if (data.isTyping) {
        updatedUsers = currentUsers.includes(data.username)
          ? currentUsers
          : [...currentUsers, data.username];
      } else {
        updatedUsers = currentUsers.filter(username => username !== data.username);
      }

      dispatch({
        type: 'SET_TYPING_USERS',
        payload: { roomId: data.roomId, users: updatedUsers },
      });
    };

    // User events
    const handleUserJoined = (data: { userId: string; username: string; roomId: string }) => {
      if (state.currentRoom?.id === data.roomId) {
        toast.success(`${data.username} joined the room`);
      }
      loadOnlineUsers(); // Refresh online users
    };

    const handleUserLeft = (data: { userId: string; username: string; roomId: string }) => {
      if (state.currentRoom?.id === data.roomId) {
        toast(`${data.username} left the room`);
      }
      loadOnlineUsers(); // Refresh online users
    };

    const handleUserStatusChanged = (data: { userId: string; status: string }) => {
      loadOnlineUsers(); // Refresh online users
    };

    // Room events
    const handleRoomCreated = (room: Room) => {
      dispatch({ type: 'ADD_ROOM', payload: room });
      toast.success(`New room "${room.name}" created`);
    };

    // Error events
    const handleError = (error: { message: string; code?: string }) => {
      toast.error(error.message);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
    socket.on(SOCKET_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(SOCKET_EVENTS.MESSAGE_EDITED, handleMessageEdited);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    socket.on(SOCKET_EVENTS.TYPING_INDICATOR, handleTypingIndicator);
    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
    socket.on(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    return () => {
      // Clean up event listeners
      socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
      socket.off(SOCKET_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(SOCKET_EVENTS.MESSAGE_EDITED, handleMessageEdited);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      socket.off(SOCKET_EVENTS.TYPING_INDICATOR, handleTypingIndicator);
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      socket.off(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
      socket.off(SOCKET_EVENTS.ERROR, handleError);
    };
  }, [state.typingUsers, state.currentRoom]);

  // Connect to socket
  const connectSocket = async () => {
    try {
      await socketManager.connect();
    } catch (error: any) {
      console.error('Socket connection failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to chat server' });
    }
  };

  // Disconnect socket
  const disconnectSocket = () => {
    socketManager.disconnect();
    dispatch({ type: 'SET_CONNECTED', payload: false });
  };

  // Load rooms
  const loadRooms = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.get<Room[]>(API_ENDPOINTS.ROOMS.LIST);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_ROOMS', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load rooms' });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load rooms' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load online users
  const loadOnlineUsers = async () => {
    try {
      const response = await ApiClient.get<User[]>(API_ENDPOINTS.USERS.ONLINE);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_ONLINE_USERS', payload: response.data });
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  // Join room
  const joinRoom = async (roomId: string) => {
    try {
      // Leave current room first
      if (state.currentRoom) {
        socketManager.leaveRoom(state.currentRoom.id);
      }

      // Join new room via API
      const response = await ApiClient.post(API_ENDPOINTS.ROOMS.JOIN(roomId));
      
      if (response.success) {
        // Get room details
        const roomResponse = await ApiClient.get<Room>(API_ENDPOINTS.ROOMS.DETAILS(roomId));
        
        if (roomResponse.success && roomResponse.data) {
          dispatch({ type: 'SET_CURRENT_ROOM', payload: roomResponse.data });
          
          // Join room via socket
          socketManager.joinRoom(roomId);
          
          // Load messages for this room
          await loadMessages(roomId);
        }
      } else {
        toast.error(response.error || 'Failed to join room');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
    }
  };

  // Leave room
  const leaveRoom = async (roomId: string) => {
    try {
      const response = await ApiClient.post(API_ENDPOINTS.ROOMS.LEAVE(roomId));
      
      if (response.success) {
        socketManager.leaveRoom(roomId);
        
        if (state.currentRoom?.id === roomId) {
          dispatch({ type: 'SET_CURRENT_ROOM', payload: null });
        }
        
        // Reload rooms to update join status
        await loadRooms();
      } else {
        toast.error(response.error || 'Failed to leave room');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave room');
    }
  };

  // Create room
  const createRoom = async (name: string, description?: string, isPrivate = false): Promise<Room | null> => {
    try {
      const response = await ApiClient.post<Room>(API_ENDPOINTS.ROOMS.CREATE, {
        name,
        description,
        isPrivate,
      });
      
      if (response.success && response.data) {
        dispatch({ type: 'ADD_ROOM', payload: response.data });
        toast.success('Room created successfully');
        return response.data;
      } else {
        toast.error(response.error || 'Failed to create room');
        return null;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
      return null;
    }
  };

  // Load messages
  const loadMessages = async (roomId: string) => {
    try {
      const response = await ApiClient.get<{ messages: Message[] }>(
        API_ENDPOINTS.ROOMS.MESSAGES(roomId)
      );
      
      if (response.success && response.data) {
        dispatch({
          type: 'SET_MESSAGES',
          payload: { roomId, messages: response.data.messages },
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (!state.currentRoom) {
      toast.error('No room selected');
      return;
    }

    try {
      // Send via socket for real-time delivery
      socketManager.sendMessage(state.currentRoom.id, content);
      
      // Stop typing indicator
      stopTyping();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  // Start typing
  const startTyping = () => {
    if (state.currentRoom) {
      socketManager.startTyping(state.currentRoom.id);
    }
  };

  // Stop typing
  const stopTyping = () => {
    if (state.currentRoom) {
      socketManager.stopTyping(state.currentRoom.id);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: ChatContextType = {
    ...state,
    loadRooms,
    joinRoom,
    leaveRoom,
    createRoom,
    sendMessage,
    loadMessages,
    connectSocket,
    disconnectSocket,
    startTyping,
    stopTyping,
    clearError,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use chat context
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}