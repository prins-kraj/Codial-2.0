import React, { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Copy, Reply } from 'lucide-react';
import { Message, DirectMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import Button from '@/components/ui/Button';
import { HelperUtils } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface MessageActionsProps {
  message: Message | DirectMessage;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  className?: string;
}

function MessageActions({ 
  message, 
  onEdit, 
  onDelete, 
  onReply, 
  className = '' 
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const menuRef = useClickOutside<HTMLDivElement>(() => setShowMenu(false));

  // Determine if this is a direct message or room message
  const isDirectMessage = 'senderId' in message;
  const messageUserId = isDirectMessage ? message.senderId : message.userId;
  
  const isOwnMessage = user?.id === messageUserId;
  const canEdit = isOwnMessage && !message.isDeleted;
  const canDelete = isOwnMessage && !message.isDeleted;

  const handleCopyMessage = async () => {
    if (message.isDeleted) {
      toast.error('Cannot copy deleted message');
      setShowMenu(false);
      return;
    }

    const success = await HelperUtils.copyToClipboard(message.content);
    if (success) {
      toast.success('Message copied to clipboard');
    } else {
      toast.error('Failed to copy message');
    }
    setShowMenu(false);
  };

  const handleEdit = () => {
    if (onEdit && canEdit) {
      onEdit();
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (onDelete && canDelete) {
      onDelete();
    }
    setShowMenu(false);
  };

  const handleReply = () => {
    if (onReply) {
      onReply();
    }
    setShowMenu(false);
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        aria-label="Message actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {/* Copy message - always available for non-deleted messages */}
          {!message.isDeleted && (
            <button
              onClick={handleCopyMessage}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy message
            </button>
          )}

          {/* Reply - available for all non-deleted messages */}
          {!message.isDeleted && onReply && (
            <button
              onClick={handleReply}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </button>
          )}

          {/* Separator if there are both general and owner actions */}
          {!message.isDeleted && (canEdit || canDelete) && (
            <div className="border-t border-gray-100 my-1" />
          )}

          {/* Edit message - only for own messages */}
          {canEdit && onEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit message
            </button>
          )}

          {/* Delete message - only for own messages */}
          {canDelete && onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete message
            </button>
          )}

          {/* Show message if no actions available */}
          {message.isDeleted && (
            <div className="px-4 py-2 text-sm text-gray-500 italic">
              No actions available for deleted messages
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageActions;