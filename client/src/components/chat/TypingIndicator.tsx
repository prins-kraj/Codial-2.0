import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

interface TypingIndicatorProps {
  roomId: string;
}

function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const { typingUsers } = useChat();
  const { user } = useAuth();
  
  const typingInRoom = typingUsers[roomId] || [];
  // Filter out current user from typing indicators
  const otherUsersTyping = typingInRoom.filter(username => username !== user?.username);

  if (otherUsersTyping.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherUsersTyping.length === 1) {
      return `${otherUsersTyping[0]} is typing...`;
    } else if (otherUsersTyping.length === 2) {
      return `${otherUsersTyping[0]} and ${otherUsersTyping[1]} are typing...`;
    } else {
      return `${otherUsersTyping[0]} and ${otherUsersTyping.length - 1} others are typing...`;
    }
  };

  return (
    <div className="px-6 py-2 border-t border-gray-100">
      <div className="flex items-center space-x-2">
        {/* Typing animation dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        
        {/* Typing text */}
        <span className="text-sm text-gray-500 italic">
          {getTypingText()}
        </span>
      </div>
    </div>
  );
}

export default TypingIndicator;