import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { ValidationUtils } from '@/utils/validation';
import { UI_CONSTANTS } from '@/config/constants';
import Button from '@/components/ui/Button';
import { HelperUtils } from '@/utils/helpers';
import toast from 'react-hot-toast';

function MessageInput() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, startTyping, stopTyping, currentRoom } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, UI_CONSTANTS.TYPING_TIMEOUT);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Prevent exceeding max length
    if (value.length > UI_CONSTANTS.MAX_MESSAGE_LENGTH) {
      return;
    }

    setMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentRoom) {
      toast.error('No room selected');
      return;
    }

    const trimmedMessage = message.trim();
    
    // Validate message
    const validationError = ValidationUtils.validateMessage(trimmedMessage);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await sendMessage(trimmedMessage);
      setMessage('');
      handleTypingStop();
      
      // Focus back to input
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = () => {
    // TODO: Implement emoji picker
    toast('Emoji picker coming soon! 😊');
  };

  const remainingChars = UI_CONSTANTS.MAX_MESSAGE_LENGTH - message.length;
  const isNearLimit = remainingChars < 100;

  if (!currentRoom) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Message input */}
        <div className="flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${currentRoom.name}`}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Emoji button */}
            <button
              type="button"
              onClick={handleEmojiClick}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          
          {/* Character count */}
          {isNearLimit && (
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${remainingChars < 50 ? 'text-red-500' : 'text-gray-400'}`}>
                {remainingChars} characters remaining
              </span>
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={!message.trim()}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Typing hint */}
      <div className="mt-2 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

export default MessageInput;