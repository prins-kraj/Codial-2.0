import React from 'react';
import { UserStatus } from '@/types';
import { HelperUtils } from '@/utils/helpers';
import { cn } from '@/utils/cn';

interface UserStatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md';
  className?: string;
  showText?: boolean;
}

function UserStatusIndicator({ 
  status, 
  size = 'md', 
  className, 
  showText = false 
}: UserStatusIndicatorProps) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
  };

  const statusColor = HelperUtils.getUserStatusColor(status);
  const statusText = HelperUtils.getUserStatusText(status);

  if (showText) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div
          className={cn(
            'rounded-full border-2 border-white',
            statusColor,
            sizes[size]
          )}
        />
        <span className="text-sm text-gray-600">{statusText}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full border-2 border-white',
        statusColor,
        sizes[size],
        className
      )}
      title={statusText}
    />
  );
}

export default UserStatusIndicator;