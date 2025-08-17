import React from 'react';
import { AuthUser, User } from '@/types';
import { HelperUtils } from '@/utils/helpers';
import { cn } from '@/utils/cn';

interface UserAvatarProps {
  user: AuthUser | User;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const sizes = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  const initials = HelperUtils.getInitials(user.username);
  const avatarColor = HelperUtils.getAvatarColor(user.username);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white',
        avatarColor,
        sizes[size],
        className
      )}
      title={user.username}
    >
      {initials}
    </div>
  );
}

export default UserAvatar;