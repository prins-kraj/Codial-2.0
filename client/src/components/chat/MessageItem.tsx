import React, { useState } from 'react';
import { AuthUser, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import UserProfileComponent from './UserProfileComponent';
import MessageActions from './MessageActions';
import EditMessageInput from './EditMessageInput';
import { ApiClient } from '@/utils/api';
import { socketManager } from '@/utils/socket';
import { SOCKET_EVENTS } from '@/config/constants';
import toast from 'react-hot-toast';

interface MessageItemProps {
  message: Message;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  onMessageUpdate?: (updatedMessage: Message) => void;
  onMessageDelete?: (messageId: string) => void;
}

function MessageItem({ 
  message, 
  isGroupStart, 
  onMessageUpdate,
  onMessageDelete 
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();

  const handleEditMessage = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (content: string) => {
    try {
      // Update via API
      const response = await ApiClient.editMessage(message.id, { content });
      
      if (response.success && response.data) {
        // Emit socket event for real-time updates
        socketManager.getSocket()?.emit(SOCKET_EVENTS.EDIT_MESSAGE, {
          messageId: message.id,
          content
        });
        
        // Update local state
        if (onMessageUpdate) {
          onMessageUpdate(response.data);
        }
        
        toast.success('Message updated');
        setIsEditing(false);
      } else {
        toast.error(response.error || 'Failed to update message');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update message');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDeleteMessage = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await ApiClient.deleteMessage(message.id);
      
      if (response.success) {
        // Emit socket event for real-time updates
        socketManager.getSocket()?.emit(SOCKET_EVENTS.DELETE_MESSAGE, { messageId: message.id });
        
        // Update local state
        if (onMessageDelete) {
          onMessageDelete(message.id);
        }
        
        toast.success('Message deleted');
      } else {
        toast.error(response.error || 'Failed to delete message');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleUsernameClick = () => {
    setShowProfile(true);
  };

  const handleAvatarClick = () => {
    setShowProfile(true);
  };

  return (
    <div
      className={`group relative ${isGroupStart ? 'mt-4' : 'mt-1'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar (only show for group start) */}
        <div className="w-10 flex-shrink-0">
          {isGroupStart ? (
            <button
              onClick={handleAvatarClick}
              className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
            >
              <UserAvatar user={message.user as AuthUser} size="md" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Username and timestamp (only show for group start) */}
          {isGroupStart && (
            <div className="flex items-baseline space-x-2 mb-1">
              <button
                onClick={handleUsernameClick}
                className="text-sm font-semibold text-gray-900 hover:text-primary-600 focus:outline-none focus:underline transition-colors"
              >
                {message.user.username}
              </button>
              <span className="text-xs text-gray-500">
                {HelperUtils.formatMessageTime(message.createdAt)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>
          )}

          {/* Message content */}
          <div className="min-w-0">
            {isEditing ? (
              <EditMessageInput
                message={message}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                className="mt-1"
              />
            ) : message.isDeleted ? (
              <div className="text-sm text-gray-400 italic">
                This message was deleted
              </div>
            ) : (
              <div
                className={`
                  text-sm text-gray-900 break-words
                  ${!isGroupStart ? 'hover:bg-gray-50 -ml-3 pl-3 py-1 rounded' : ''}
                `}
              >
                {message.content}
              </div>
            )}
          </div>

          {/* Timestamp for grouped messages (show on hover) */}
          {!isGroupStart && isHovered && (
            <div className="text-xs text-gray-400 mt-1">
              {HelperUtils.formatTime(message.createdAt)}
              {message.editedAt && (
                <span className="ml-1 italic">(edited)</span>
              )}
            </div>
          )}
        </div>

        {/* Message actions */}
        {isHovered && !isEditing && (
          <MessageActions
            message={message}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            className="flex items-center space-x-1"
          />
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileComponent
        userId={message.userId}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}

export default MessageItem;
