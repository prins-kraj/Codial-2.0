import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { Message, DirectMessage } from '@/types';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface EditMessageInputProps {
  message: Message | DirectMessage;
  onSave: (content: string) => void;
  onCancel: () => void;
  maxLength?: number;
  className?: string;
}

function EditMessageInput({ 
  message, 
  onSave, 
  onCancel, 
  maxLength = 2000,
  className = '' 
}: EditMessageInputProps) {
  const [content, setContent] = useState(message.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and select text when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSave = async () => {
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      return;
    }

    if (trimmedContent === message.content) {
      handleCancel();
      return;
    }

    if (trimmedContent.length > maxLength) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(trimmedContent);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent(message.content);
    onCancel();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars <= 50;
  const hasChanges = content.trim() !== message.content;
  const canSave = content.trim() && !isOverLimit && hasChanges && !isSubmitting;

  return (
    <div className={cn('bg-white border border-gray-300 rounded-lg p-3 shadow-sm', className)}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Edit your message..."
        className={cn(
          'w-full resize-none border-none outline-none text-sm',
          'placeholder-gray-400 min-h-[20px] max-h-32 overflow-y-auto',
          isOverLimit && 'text-red-600'
        )}
        disabled={isSubmitting}
        rows={1}
      />

      {/* Footer with character count and actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {/* Character count */}
        <div className="flex items-center space-x-2">
          {(isNearLimit || isOverLimit) && (
            <span className={cn(
              'text-xs font-medium',
              isOverLimit ? 'text-red-600' : 'text-yellow-600'
            )}>
              {remainingChars} characters {isOverLimit ? 'over limit' : 'remaining'}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-8 px-3"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="h-8 px-3"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to save, 
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Esc</kbd> to cancel
      </div>
    </div>
  );
}

export default EditMessageInput;