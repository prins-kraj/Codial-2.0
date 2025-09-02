import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Search, MoreVertical, User } from 'lucide-react';
import { useDirectMessages } from '@/contexts/DirectMessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import UserProfileComponent from './UserProfileComponent';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { HelperUtils } from '@/utils/helpers';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks/useClickOutside';

interface DirectMessagesListProps {
  onMobileClose?: () => void;
}

function DirectMessagesList({ onMobileClose }: DirectMessagesListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: currentUserId } = useParams();
  const {
    conversations,
    setActiveConversation,
    getUnreadCount,
    isLoading,
    error,
  } = useDirectMessages();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null);
  const menuRef = useClickOutside<HTMLDivElement>(() => setShowMenuFor(null));

  const handleConversationSelect = (participantId: string) => {
    console.log(
      'DirectMessagesList: Starting chat with participant:',
      participantId
    );
    setActiveConversation(participantId);
    navigate(`/chat/dm/${participantId}`);
    onMobileClose?.();
  };

  const formatLastActivity = (lastActivity: string) => {
    return HelperUtils.formatRelativeTime(lastActivity);
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    return content.length > maxLength
      ? `${content.substring(0, maxLength)}...`
      : content;
  };

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setShowMenuFor(null);
  };

  const handleMenuClick = (e: React.MouseEvent, participantId: string) => {
    e.stopPropagation();
    setShowMenuFor(showMenuFor === participantId ? null : participantId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage
          error={error}
          variant="card"
          onDismiss={() => {
            /* Clear error if needed */
          }}
        />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <MessageCircle className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-sm text-center">
          No direct messages yet.
          <br />
          Start a conversation by clicking on a user's profile.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map(conversation => {
          const unreadCount = getUnreadCount(conversation.participantId);
          const isActive = currentUserId === conversation.participantId;

          return (
            <div
              key={conversation.participantId}
              className={cn(
                'relative flex items-center space-x-3 hover:bg-gray-50 transition-colors border-b border-gray-100',
                isActive && 'bg-primary-50 border-primary-200'
              )}
            >
              <button
                onClick={() =>
                  handleConversationSelect(conversation.participantId)
                }
                className="flex-1 p-4 flex items-center space-x-3 text-left"
              >
                {/* User avatar with status */}
                <div className="relative flex-shrink-0">
                  <UserAvatar user={conversation.participant} size="md" />
                  <div className="absolute -bottom-1 -right-1">
                    <UserStatusIndicator
                      status={conversation.participant.status}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Conversation info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={cn(
                        'font-medium truncate',
                        unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                      )}
                    >
                      {conversation.participant.username}
                    </h3>

                    {/* Unread count badge */}
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-primary-600 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[20px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Last message preview */}
                    <p
                      className={cn(
                        'text-sm truncate',
                        unreadCount > 0
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-500'
                      )}
                    >
                      {conversation.lastMessage ? (
                        <>
                          {conversation.lastMessage.senderId === user?.id && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {truncateMessage(conversation.lastMessage.content)}
                        </>
                      ) : (
                        'No messages yet'
                      )}
                    </p>

                    {/* Last activity time */}
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatLastActivity(conversation.lastActivity)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Menu button */}
              <div className="relative pr-2" ref={menuRef}>
                <button
                  onClick={e => handleMenuClick(e, conversation.participantId)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown menu */}
                {showMenuFor === conversation.participantId && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() =>
                        handleViewProfile(conversation.participantId)
                      }
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileComponent
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

export default DirectMessagesList;
