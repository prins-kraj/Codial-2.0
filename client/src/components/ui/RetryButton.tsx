import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Button from './Button';
import { cn } from '@/utils/cn';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  disabled?: boolean;
}

const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  className,
  variant = 'secondary',
  size = 'sm',
  children = 'Try Again',
  disabled = false,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      variant={variant}
      size={size}
      disabled={disabled || isRetrying}
      className={cn('flex items-center space-x-2', className)}
    >
      <RefreshCw className={cn(
        'h-4 w-4',
        isRetrying && 'animate-spin'
      )} />
      <span>{children}</span>
    </Button>
  );
};

export default RetryButton;