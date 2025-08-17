import React, { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import { AuthUser, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import Button from '@/components/ui/Button';
import { useClickOutside } from '@/hooks/useClickOutside';
import toast from 'react-hot-toast';

interface MessageItemProps {
  message: Message;
  isGroupStart: boolean;
  isGroupEnd: boolean;
}

function MessageItem({ message, isGroupStart, isGroupEnd }: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();
  const menuRef = useClickOutside<HTMLDivElement>(() => setShowMenu(false));

  const isOwnMessage = user?.id === message.userId;
  const canEdit = isOwnMessage && !message.editedAt;
  const canDelete = isOwnMessage;

  const handleCopyMessage = async () => {
    const success = await HelperUtils.copyToClipboard(message.content);
    if (success) {
      toast.success('Message copied to clipboard');
    } else {
      toast.error('Failed to copy message');
    }
    setShowMenu(false);
  };

  const handleEditMessage = () => {
    // TODO: Implement edit functionality
    toast('Edit functionality coming soon!');
    setShowMenu(false);
  };

  const handleDeleteMessage = () => {
    // TODO: Implement delete functionality
    toast('Delete functionality coming soon!');
    setShowMenu(false);
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
            <UserAvatar user={message.user as AuthUser} size="md" />
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Username and timestamp (only show for group start) */}
          {isGroupStart && (
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {message.user.username}
              </span>
              <span className="text-xs text-gray-500">
                {HelperUtils.formatMessageTime(message.createdAt)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>
          )}

          {/* Message text */}
          <div
            className={`
              text-sm text-gray-900 break-words
              ${!isGroupStart ? 'hover:bg-gray-50 -ml-3 pl-3 py-1 rounded' : ''}
            `}
          >
            {message.content}
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
        {isHovered && (
          <div className="flex items-center space-x-1">
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleCopyMessage}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy message
                  </button>

                  {canEdit && (
                    <button
                      onClick={handleEditMessage}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit message
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={handleDeleteMessage}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete message
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageItem;
