import React, { useEffect, useRef, useState } from 'react';
import { Send, Smile, ArrowLeft, MoreVertical } from 'lucide-react';
import { useDirectMessages } from '@/contexts/DirectMessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { ValidationUtils } from '@/utils/validation';
import { UI_CONSTANTS, SOCKET_EVENTS } from '@/config/constants';
import { HelperUtils } from '@/utils/helpers';
import { socketManager } from '@/utils/socket';
import { DirectMessage, UserProfile } from '@/types';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import UserProfileComponent from './UserProfileComponent';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

import ErrorMessage from '@/components/ui/ErrorMessage';
import toast from 'react-hot-toast';

interface DirectMessageChatProps {
  participantId: string;
  onBack?: () => void;
}

function DirectMessageChat({ participantId, onBack }: DirectMessageChatProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [participant, setParticipant] = useState<UserProfile | null>(null);
  const [loadingParticipant, setLoadingParticipant] = useState(false);

  const { user } = useAuth();
  const {
    messages,
    conversations,
    loadMessages,
    sendMessage,
    setActiveConversation,
    isLoading,
    error,
  } = useDirectMessages();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Debug logging
  console.log('DirectMessageChat: messages object:', messages);
  console.log(
    'DirectMessageChat: messages[participantId]:',
    messages[participantId]
  );
  console.log('DirectMessageChat: participantId:', participantId);
  console.log('DirectMessageChat: typeof messages:', typeof messages);
  console.log(
    'DirectMessageChat: messages is object:',
    typeof messages === 'object' && messages !== null
  );

  // Ensure messages is an object and get conversation messages safely
  const safeMessages =
    typeof messages === 'object' && messages !== null ? messages : {};
  const rawConversationMessages = safeMessages[participantId];

  // Handle both array format and object format with messages property
  let conversationMessages: DirectMessage[] = [];
  if (Array.isArray(rawConversationMessages)) {
    conversationMessages = rawConversationMessages;
  } else if (
    rawConversationMessages &&
    typeof rawConversationMessages === 'object' &&
    'messages' in rawConversationMessages
  ) {
    const messagesData = (rawConversationMessages as any).messages;
    conversationMessages = Array.isArray(messagesData) ? messagesData : [];
  }

  console.log('DirectMessageChat: safeMessages:', safeMessages);
  console.log(
    'DirectMessageChat: rawConversationMessages:',
    rawConversationMessages
  );
  console.log('DirectMessageChat: conversationMessages:', conversationMessages);
  console.log(
    'DirectMessageChat: conversationMessages.length:',
    conversationMessages.length
  );

  // Try to get participant from existing conversations first
  const existingParticipant = conversations.find(
    c => c.participantId === participantId
  )?.participant;

  // Load participant data if not available in conversations
  useEffect(() => {
    if (participantId) {
      if (existingParticipant) {
        console.log(
          'DirectMessageChat: Using existing participant:',
          existingParticipant
        );
        setParticipant(existingParticipant);
      } else {
        console.log(
          'DirectMessageChat: Loading participant data for:',
          participantId
        );
        setLoadingParticipant(true);

        // Load participant profile from API
        import('@/utils/api').then(({ ApiClient }) => {
          ApiClient.getUserProfile(participantId)
            .then(response => {
              if (response.success && response.data) {
                console.log(
                  'DirectMessageChat: Participant loaded:',
                  response.data
                );
                setParticipant(response.data);
              } else {
                console.error(
                  'DirectMessageChat: Failed to load participant:',
                  response.error
                );
              }
            })
            .catch(error => {
              console.error(
                'DirectMessageChat: Error loading participant:',
                error
              );
            })
            .finally(() => {
              setLoadingParticipant(false);
            });
        });
      }
    }
  }, [participantId, existingParticipant]);

  // Load messages and set active conversation when participant changes
  useEffect(() => {
    if (participantId) {
      try {
        console.log(
          'DirectMessageChat: Setting active conversation for:',
          participantId
        );
        setActiveConversation(participantId);

        console.log('DirectMessageChat: Loading messages for:', participantId);
        loadMessages(participantId);

        console.log(
          'DirectMessageChat: Joining direct conversation for:',
          participantId
        );
        // Join direct conversation for real-time updates
        socketManager.joinDirectConversation(participantId);
      } catch (error) {
        console.error('DirectMessageChat: Error in useEffect:', error);
      }
    }

    // Cleanup: leave conversation when component unmounts or participant changes
    return () => {
      if (participantId) {
        try {
          console.log(
            'DirectMessageChat: Leaving direct conversation for:',
            participantId
          );
          socketManager.leaveDirectConversation(participantId);
        } catch (error) {
          console.error('DirectMessageChat: Error in cleanup:', error);
        }
      }
    };
  }, [participantId, setActiveConversation, loadMessages]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleDirectMessageReceived = (message: DirectMessage) => {
      // Only handle messages for current conversation
      if (
        message.senderId === participantId ||
        message.receiverId === participantId
      ) {
        // The context will handle adding the message to state
        // We just need to scroll to bottom if user is not scrolling
        if (!isUserScrolling) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    };

    const handleDirectMessageEdited = (message: DirectMessage) => {
      // Only handle messages for current conversation
      if (
        message.senderId === participantId ||
        message.receiverId === participantId
      ) {
        // The context will handle updating the message in state
        toast.success('Message edited');
      }
    };

    const handleDirectMessageDeleted = (data: {
      messageId: string;
      conversationId: string;
    }) => {
      // Check if this message belongs to our conversation
      const conversationId = [user?.id, participantId].sort().join('-');
      if (data.conversationId === conversationId) {
        // The context will handle removing the message from state
        toast.success('Message deleted');
      }
    };

    const handleUserStatusChanged = (data: {
      userId: string;
      status: string;
    }) => {
      // Update participant status if it's for current participant
      if (data.userId === participantId) {
        // The context will handle updating user status
      }
    };

    const handleUserProfileUpdated = (profile: UserProfile) => {
      // Update participant profile if it's for current participant
      if (profile.id === participantId) {
        // The context will handle updating user profile
      }
    };

    // Register event listeners
    socket.on(
      SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
      handleDirectMessageReceived
    );
    socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_EDITED, handleDirectMessageEdited);
    socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_DELETED, handleDirectMessageDeleted);
    socket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
    socket.on(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);

    // Cleanup event listeners
    return () => {
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
        handleDirectMessageReceived
      );
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_EDITED,
        handleDirectMessageEdited
      );
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_DELETED,
        handleDirectMessageDeleted
      );
      socket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      socket.off(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);
    };
  }, [participantId, isUserScrolling]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Auto-scroll to bottom when new messages arrive (if user is not scrolling)
  useEffect(() => {
    if (!isUserScrolling && conversationMessages.length > 0) {
      scrollToBottom();
    }
  }, [conversationMessages.length, isUserScrolling]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = HelperUtils.isScrolledToBottom(container, 100);

      setShowScrollButton(!isAtBottom);

      // Detect if user is actively scrolling
      setIsUserScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set user scrolling to false after 1 second of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      HelperUtils.smoothScrollToBottom(containerRef.current!);
    }
  };

  const handleScrollButtonClick = () => {
    setIsUserScrolling(false);
    scrollToBottom();
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, UI_CONSTANTS.TYPING_TIMEOUT);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Prevent exceeding max length
    if (value.length > UI_CONSTANTS.MAX_MESSAGE_LENGTH) {
      return;
    }

    setMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participant) {
      toast.error('Participant not found');
      return;
    }

    const trimmedMessage = message.trim();

    // Validate message
    const validationError = ValidationUtils.validateMessage(trimmedMessage);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      console.log('DirectMessageChat: Sending message to:', participantId);
      await sendMessage(participantId, trimmedMessage);
      setMessage('');
      handleTypingStop();

      // Focus back to input
      textareaRef.current?.focus();
      console.log('DirectMessageChat: Message sent successfully');
    } catch (error) {
      console.error('DirectMessageChat: Failed to send direct message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = () => {
    // TODO: Implement emoji picker
    toast('Emoji picker coming soon! 😊');
  };

  const formatMessageTime = (timestamp: string) => {
    return HelperUtils.formatMessageTime(timestamp);
  };

  let groupedMessages: Record<string, typeof conversationMessages> = {};

  try {
    if (
      Array.isArray(conversationMessages) &&
      conversationMessages.length > 0
    ) {
      // Sort messages by creation date (oldest first, newest last)
      const sortedMessages = [...conversationMessages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      groupedMessages = sortedMessages.reduce((groups, message) => {
        try {
          const date = new Date(message.createdAt).toDateString();
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(message);
          return groups;
        } catch (messageError) {
          console.error(
            'DirectMessageChat: Error processing message:',
            message,
            messageError
          );
          return groups;
        }
      }, {} as Record<string, typeof conversationMessages>);
    }
  } catch (error) {
    console.error('DirectMessageChat: Error grouping messages:', error);
    groupedMessages = {};
  }

  console.log('DirectMessageChat: groupedMessages:', groupedMessages);

  const remainingChars = UI_CONSTANTS.MAX_MESSAGE_LENGTH - message.length;
  const isNearLimit = remainingChars < 100;

  // Early return if messages object is not properly initialized
  if (!messages || typeof messages !== 'object') {
    console.log(
      'DirectMessageChat: Messages not properly initialized, showing loading...'
    );
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 mt-4">Initializing chat...</p>
        </div>
      </div>
    );
  }

  if (loadingParticipant || (!participant && !error)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 mt-4">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Participant not found</p>
          {error && (
            <ErrorMessage
              error={error}
              variant="card"
              className="mt-4 max-w-md mx-auto"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          {/* Back button (mobile) */}
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Participant info */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center space-x-3 flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1 -m-1"
          >
            <div className="relative flex-shrink-0">
              <UserAvatar user={participant} size="md" />
              <div className="absolute -bottom-1 -right-1">
                <UserStatusIndicator status={participant.status} size="sm" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate hover:text-primary-600 transition-colors">
                {participant.username}
              </h2>
              <p className="text-sm text-gray-500">
                {participant.status === 'ONLINE'
                  ? 'Online'
                  : participant.status === 'AWAY'
                  ? 'Away'
                  : `Last seen ${HelperUtils.formatRelativeTime(
                      participant.lastSeen
                    )}`}
              </p>
            </div>
          </button>

          {/* More options */}
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading && conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-gray-500 text-lg mb-2">No messages yet</p>
              <p className="text-gray-400 text-sm">
                Start the conversation with {participant.username}!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            <div
              ref={containerRef}
              className="absolute inset-0 overflow-y-auto px-6 py-4 space-y-4"
            >
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                      {HelperUtils.isToday(date)
                        ? 'Today'
                        : HelperUtils.isYesterday(date)
                        ? 'Yesterday'
                        : HelperUtils.formatDate(date)}
                    </div>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-2">
                    {dateMessages.map((msg, index) => {
                      const prevMessage =
                        index > 0 ? dateMessages[index - 1] : null;
                      const isOwnMessage = msg.senderId === user?.id;
                      const isGroupStart =
                        !prevMessage || prevMessage.senderId !== msg.senderId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          } ${isGroupStart ? 'mt-4' : 'mt-1'}`}
                        >
                          <div
                            className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                              isOwnMessage
                                ? 'flex-row-reverse space-x-reverse'
                                : ''
                            }`}
                          >
                            {/* Avatar (only show for group start and other user's messages) */}
                            <div className="w-8 flex-shrink-0">
                              {isGroupStart && !isOwnMessage ? (
                                <button
                                  onClick={() => setShowProfile(true)}
                                  className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
                                >
                                  <UserAvatar user={msg.sender} size="sm" />
                                </button>
                              ) : (
                                <div className="w-8" />
                              )}
                            </div>

                            {/* Message bubble */}
                            <div
                              className={`
                            px-4 py-2 rounded-lg break-words
                            ${
                              isOwnMessage
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }
                            ${isGroupStart ? 'rounded-tl-lg' : ''}
                          `}
                            >
                              <p className="text-sm">{msg.content}</p>

                              {/* Timestamp */}
                              <div
                                className={`text-xs mt-1 ${
                                  isOwnMessage
                                    ? 'text-primary-100'
                                    : 'text-gray-500'
                                }`}
                              >
                                {formatMessageTime(msg.createdAt)}
                                {msg.editedAt && (
                                  <span className="ml-1 italic">(edited)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-4 right-6">
            <Button
              onClick={handleScrollButtonClick}
              className="rounded-full shadow-lg"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 rotate-90" />
            </Button>
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* Message input */}
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${participant.username}`}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              {/* Emoji button */}
              <button
                type="button"
                onClick={handleEmojiClick}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>

            {/* Character count */}
            {isNearLimit && (
              <div className="flex justify-end mt-1">
                <span
                  className={`text-xs ${
                    remainingChars < 50 ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {remainingChars} characters remaining
                </span>
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            type="submit"
            disabled={!message.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Typing hint */}
        <div className="mt-2 text-xs text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileComponent
        userId={participantId}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
    // </div>
  );
}

export default DirectMessageChat;
