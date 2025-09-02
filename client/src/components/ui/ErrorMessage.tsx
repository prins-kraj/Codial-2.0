import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';

interface ErrorMessageProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: 'inline' | 'banner' | 'card';
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  className,
  variant = 'inline',
  showIcon = true,
}) => {
  if (!error) return null;

  const baseClasses = 'flex items-center text-red-600';
  
  const variantClasses = {
    inline: 'text-sm',
    banner: 'bg-red-50 border border-red-200 rounded-md p-3 text-sm',
    card: 'bg-red-50 border border-red-200 rounded-lg p-4',
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {showIcon && (
        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
      )}
      
      <span className="flex-1">{error}</span>
      
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="ml-2 h-auto p-1 text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ErrorMessage;