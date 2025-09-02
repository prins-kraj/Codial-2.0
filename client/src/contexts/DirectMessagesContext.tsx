import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  DirectMessagesState,
  DirectConversation,
  DirectMessage,
  SendDirectMessageRequest,
} from '@/types';
import { ApiClient } from '@/utils/api';
import { socketManager } from '@/utils/socket';
import { SOCKET_EVENTS } from '@/config/constants';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Direct Messages actions
type DirectMessagesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERSATIONS'; payload: DirectConversation[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | {
      type: 'SET_MESSAGES';
      payload: { conversationId: string; messages: DirectMessage[] };
    }
  | {
      type: 'ADD_MESSAGE';
      payload: { message: DirectMessage; currentUserId: string };
    }
  | { type: 'UPDATE_MESSAGE'; payload: DirectMessage }
  | {
      type: 'DELETE_MESSAGE';
      payload: { messageId: string; conversationId: string };
    }
  | { type: 'UPDATE_CONVERSATION'; payload: DirectConversation }
  | {
      type: 'SET_UNREAD_COUNT';
      payload: { conversationId: string; count: number };
    }
  | { type: 'CLEAR_UNREAD_COUNT'; payload: string };

// Direct Messages reducer
function directMessagesReducer(
  state: DirectMessagesState,
  action: DirectMessagesAction
): DirectMessagesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      const { message, currentUserId } = action.payload;
      // Determine the conversation ID (the other user's ID)
      const conversationId =
        message.senderId === currentUserId
          ? message.receiverId
          : message.senderId;

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [
            ...(state.messages[conversationId] || []),
            message,
          ],
        },
      };
    case 'UPDATE_MESSAGE':
      // Find which conversation this message belongs to
      const messageToUpdate = action.payload;
      let targetConversationId = '';

      // Search through all conversations to find where this message exists
      for (const [convId, messages] of Object.entries(state.messages)) {
        if (messages.some(msg => msg.id === messageToUpdate.id)) {
          targetConversationId = convId;
          break;
        }
      }

      if (!targetConversationId) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [targetConversationId]: (
            state.messages[targetConversationId] || []
          ).map(msg => (msg.id === messageToUpdate.id ? messageToUpdate : msg)),
        },
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (
            state.messages[action.payload.conversationId] || []
          ).filter(msg => msg.id !== action.payload.messageId),
        },
      };
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.participantId === action.payload.participantId
            ? action.payload
            : conv
        ),
      };
    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.conversationId]: action.payload.count,
        },
      };
    case 'CLEAR_UNREAD_COUNT':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload]: 0,
        },
      };
    default:
      return state;
  }
}

// Initial state
const initialState: DirectMessagesState = {
  conversations: [],
  activeConversation: null,
  messages: {},
  unreadCounts: {},
  isLoading: false,
  error: null,
};

// Direct Messages context
interface DirectMessagesContextType extends DirectMessagesState {
  // Conversation management
  loadConversations: () => Promise<void>;
  setActiveConversation: (userId: string | null) => void;

  // Message management
  loadMessages: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Utility
  clearError: () => void;
  markAsRead: (conversationId: string) => void;
  getUnreadCount: (conversationId: string) => number;
  getTotalUnreadCount: () => number;
}

const DirectMessagesContext = createContext<
  DirectMessagesContextType | undefined
>(undefined);

// Direct Messages provider
export function DirectMessagesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(directMessagesReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  console.log('DirectMessagesProvider: state:', state);
  console.log('DirectMessagesProvider: state.messages:', state.messages);

  // Initialize direct messages when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversations();
    }
  }, [isAuthenticated, user]);

  // Socket event handlers for direct messages
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    // Direct message events
    const handleDirectMessageReceived = (message: DirectMessage) => {
      console.log(
        'DirectMessagesContext: Received DIRECT_MESSAGE_RECEIVED event:',
        message
      );
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          message,
          currentUserId: user?.id || '',
        },
      });

      // Update unread count if not in active conversation
      const otherUserId =
        message.senderId === user?.id ? message.receiverId : message.senderId;
      if (state.activeConversation !== otherUserId) {
        const currentCount = state.unreadCounts[otherUserId] || 0;
        dispatch({
          type: 'SET_UNREAD_COUNT',
          payload: { conversationId: otherUserId, count: currentCount + 1 },
        });

        // Show notification
        toast(`New message from ${message.sender.username}`, {
          icon: '💬',
          duration: 3000,
        });
      }

      // Update conversation list to reflect new message
      loadConversations();
    };

    const handleDirectMessageSent = (message: DirectMessage) => {
      console.log(
        'DirectMessagesContext: Received DIRECT_MESSAGE_SENT event:',
        message
      );
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          message,
          currentUserId: user?.id || '',
        },
      });

      // Update conversation list
      loadConversations();
    };

    const handleDirectMessageEdited = (message: DirectMessage) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: message });
    };

    const handleDirectMessageDeleted = (data: {
      messageId: string;
      conversationId: string;
    }) => {
      dispatch({ type: 'DELETE_MESSAGE', payload: data });
    };

    // Register event listeners
    socket.on(
      SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
      handleDirectMessageReceived
    );
    socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_SENT, handleDirectMessageSent);
    socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_EDITED, handleDirectMessageEdited);
    socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_DELETED, handleDirectMessageDeleted);

    return () => {
      // Clean up event listeners
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
        handleDirectMessageReceived
      );
      socket.off(SOCKET_EVENTS.DIRECT_MESSAGE_SENT, handleDirectMessageSent);
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_EDITED,
        handleDirectMessageEdited
      );
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_DELETED,
        handleDirectMessageDeleted
      );
    };
  }, [state.activeConversation, state.unreadCounts, user]);

  // Load conversations
  const loadConversations = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await ApiClient.getDirectMessageConversations();

      if (response.success && response.data) {
        dispatch({ type: 'SET_CONVERSATIONS', payload: response.data });

        // Initialize unread counts
        response.data.forEach(conversation => {
          dispatch({
            type: 'SET_UNREAD_COUNT',
            payload: {
              conversationId: conversation.participantId,
              count: conversation.unreadCount,
            },
          });
        });
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.error || 'Failed to load conversations',
        });
      }
    } catch (error: any) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Failed to load conversations',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Set active conversation
  const setActiveConversation = (userId: string | null) => {
    console.log(
      'DirectMessagesContext: Setting active conversation to:',
      userId
    );
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: userId });

    // Clear unread count for this conversation
    if (userId) {
      dispatch({ type: 'CLEAR_UNREAD_COUNT', payload: userId });
    }
  };

  // Load messages for a specific conversation
  const loadMessages = async (userId: string) => {
    console.log('DirectMessagesContext: Loading messages for userId:', userId);
    try {
      const response = await ApiClient.getDirectMessages(userId);
      console.log('DirectMessagesContext: API response:', response);

      if (response.success && response.data) {
        console.log(
          'DirectMessagesContext: Setting messages for userId:',
          userId,
          'messages:',
          response.data
        );

        // Extract messages array from response data
        // The API returns DirectMessage[] directly, but handle both formats for robustness
        const messagesArray: DirectMessage[] = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.messages)
          ? (response.data as any).messages
          : [];

        console.log(
          'DirectMessagesContext: Extracted messages array:',
          messagesArray
        );

        dispatch({
          type: 'SET_MESSAGES',
          payload: { conversationId: userId, messages: messagesArray },
        });
        console.log('DirectMessagesContext: Messages loaded successfully');
      } else {
        console.error(
          'DirectMessagesContext: Failed to load messages:',
          response.error
        );
        dispatch({
          type: 'SET_ERROR',
          payload: response.error || 'Failed to load messages',
        });
      }
    } catch (error: any) {
      console.error('DirectMessagesContext: Error loading messages:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Failed to load messages',
      });
    }
  };

  // Send direct message
  const sendMessage = async (receiverId: string, content: string) => {
    console.log(
      'DirectMessagesContext: Sending message to:',
      receiverId,
      'content:',
      content
    );
    try {
      // Send via socket for real-time delivery
      const socket = socketManager.getSocket();
      const isConnected = socketManager.isConnected();
      console.log('DirectMessagesContext: Socket available:', !!socket);
      console.log('DirectMessagesContext: Socket connected:', isConnected);

      if (socket && isConnected) {
        console.log(
          'DirectMessagesContext: Emitting socket event SEND_DIRECT_MESSAGE'
        );
        socket.emit(SOCKET_EVENTS.SEND_DIRECT_MESSAGE, { receiverId, content });
        console.log('DirectMessagesContext: Socket event emitted successfully');
      } else {
        console.log(
          'DirectMessagesContext: Socket not available or not connected, using API fallback'
        );
        // Fallback to API if socket not available
        const response = await ApiClient.sendDirectMessage({
          receiverId,
          content,
        });
        console.log('DirectMessagesContext: API response:', response);

        if (response.success && response.data) {
          console.log(
            'DirectMessagesContext: Adding message via API:',
            response.data
          );
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              message: response.data,
              currentUserId: user?.id || '',
            },
          });
        } else {
          console.error('DirectMessagesContext: API failed:', response.error);
          toast.error(response.error || 'Failed to send message');
        }
      }
    } catch (error: any) {
      console.error('DirectMessagesContext: Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  // Edit direct message
  const editMessage = async (messageId: string, content: string) => {
    try {
      // Send via socket for real-time updates
      const socket = socketManager.getSocket();
      if (socket) {
        socket.emit(SOCKET_EVENTS.EDIT_DIRECT_MESSAGE, { messageId, content });
      } else {
        // Fallback to API
        const response = await ApiClient.editDirectMessage(messageId, {
          content,
        });

        if (response.success && response.data) {
          dispatch({ type: 'UPDATE_MESSAGE', payload: response.data });
        } else {
          toast.error(response.error || 'Failed to edit message');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to edit message');
    }
  };

  // Delete direct message
  const deleteMessage = async (messageId: string) => {
    try {
      // Send via socket for real-time updates
      const socket = socketManager.getSocket();
      if (socket) {
        socket.emit(SOCKET_EVENTS.DELETE_DIRECT_MESSAGE, { messageId });
      } else {
        // Fallback to API
        const response = await ApiClient.deleteDirectMessage(messageId);

        if (!response.success) {
          toast.error(response.error || 'Failed to delete message');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  // Mark conversation as read
  const markAsRead = (conversationId: string) => {
    dispatch({ type: 'CLEAR_UNREAD_COUNT', payload: conversationId });
  };

  // Get unread count for a conversation
  const getUnreadCount = (conversationId: string): number => {
    return state.unreadCounts[conversationId] || 0;
  };

  // Get total unread count across all conversations
  const getTotalUnreadCount = (): number => {
    return Object.values(state.unreadCounts).reduce(
      (total, count) => total + count,
      0
    );
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: DirectMessagesContextType = {
    ...state,
    loadConversations,
    setActiveConversation,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    clearError,
    markAsRead,
    getUnreadCount,
    getTotalUnreadCount,
  };

  return (
    <DirectMessagesContext.Provider value={contextValue}>
      {children}
    </DirectMessagesContext.Provider>
  );
}

// Custom hook to use direct messages context
export function useDirectMessages(): DirectMessagesContextType {
  const context = useContext(DirectMessagesContext);
  if (context === undefined) {
    throw new Error(
      'useDirectMessages must be used within a DirectMessagesProvider'
    );
  }
  return context;
}
