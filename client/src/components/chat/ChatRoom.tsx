import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentRoom, rooms, joinRoom, isLoading } = useChat();

  // Find the room data
  const room = rooms.find(r => r.id === roomId);

  // Join room when component mounts or roomId changes
  useEffect(() => {
    if (roomId && (!currentRoom || currentRoom.id !== roomId)) {
      joinRoom(roomId);
    }
  }, [roomId, currentRoom, joinRoom]);

  // Show loading while joining room
  if (isLoading || !currentRoom || currentRoom.id !== roomId) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect if room not found
  if (!room) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Header room={currentRoom} />

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <MessageList roomId={roomId!} />
        <TypingIndicator roomId={roomId!} />
      </div>

      {/* Message input */}
      <MessageInput />
    </div>
  );
}

export default ChatRoom;