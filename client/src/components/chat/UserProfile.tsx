import React from 'react';
import { AuthUser } from '@/types';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';

interface UserProfileProps {
  user: AuthUser;
}

function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <UserAvatar user={user} size="md" />
          <UserStatusIndicator status={user.status} size="sm" className="absolute -bottom-1 -right-1" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.username}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user.email}
          </p>
          <p className="text-xs text-gray-400">
            {HelperUtils.getUserStatusText(user.status)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;