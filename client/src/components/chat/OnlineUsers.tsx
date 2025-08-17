import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function OnlineUsers() {
  const { onlineUsers, isLoading } = useChat();

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 mb-2">👥</div>
        <p className="text-gray-500 text-sm">No users online</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {onlineUsers.map((user) => (
        <div
          key={user.id}
          className="px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <UserAvatar user={user} size="md" />
              <UserStatusIndicator 
                status={user.status} 
                size="sm" 
                className="absolute -bottom-1 -right-1" 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500">
                {HelperUtils.getUserStatusText(user.status)}
              </p>
              {user.lastSeen && (
                <p className="text-xs text-gray-400">
                  Last seen {HelperUtils.formatRelativeTime(user.lastSeen)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OnlineUsers;