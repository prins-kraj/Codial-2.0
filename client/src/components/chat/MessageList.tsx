import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { HelperUtils } from '@/utils/helpers';
import MessageItem from './MessageItem';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';

interface MessageListProps {
  roomId: string;
}

function MessageList({ roomId }: MessageListProps) {
  const { messages, loadMessages, isLoading } = useChat();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const roomMessages = messages[roomId] || [];

  // Load messages when room changes
  useEffect(() => {
    if (roomId) {
      loadMessages(roomId);
    }
  }, [roomId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive (if user is not scrolling)
  useEffect(() => {
    if (!isUserScrolling && roomMessages.length > 0) {
      scrollToBottom();
    }
  }, [roomMessages.length, isUserScrolling]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = HelperUtils.isScrolledToBottom(container, 100);
      
      setShowScrollButton(!isAtBottom);
      
      // Detect if user is actively scrolling
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set user scrolling to false after 1 second of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      HelperUtils.smoothScrollToBottom(containerRef.current!);
    }
  };

  const handleScrollButtonClick = () => {
    setIsUserScrolling(false);
    scrollToBottom();
  };

  // Group messages by date
  const groupedMessages = roomMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof roomMessages>);

  if (isLoading && roomMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (roomMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-gray-500 text-lg mb-2">No messages yet</p>
          <p className="text-gray-400 text-sm">
            Be the first to start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Messages container */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto px-6 py-4 space-y-4"
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                {HelperUtils.isToday(date) 
                  ? 'Today' 
                  : HelperUtils.isYesterday(date) 
                    ? 'Yesterday' 
                    : HelperUtils.formatDate(date)
                }
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {dateMessages.map((message, index) => {
                const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                const nextMessage = index < dateMessages.length - 1 ? dateMessages[index + 1] : null;
                
                // Group consecutive messages from same user
                const isGroupStart = !prevMessage || prevMessage.userId !== message.userId;
                const isGroupEnd = !nextMessage || nextMessage.userId !== message.userId;
                
                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isGroupStart={isGroupStart}
                    isGroupEnd={isGroupEnd}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-6">
          <Button
            onClick={handleScrollButtonClick}
            className="rounded-full shadow-lg"
            size="sm"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default MessageList;