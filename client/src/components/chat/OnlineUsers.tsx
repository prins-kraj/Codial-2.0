import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import UserProfileComponent from './UserProfileComponent';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function OnlineUsers() {
  const { onlineUsers, isLoading } = useChat();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
    <>
      <div className="py-2">
        {onlineUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => setSelectedUserId(user.id)}
            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-100"
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
              
              <div className="flex-1 min-w-0 text-left">
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
          </button>
        ))}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileComponent
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
}

export default OnlineUsers;