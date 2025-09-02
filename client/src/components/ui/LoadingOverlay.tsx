import React from 'react';
import { cn } from '@/utils/cn';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  children: React.ReactNode;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  className,
  children,
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;