import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ChatLayout from '@/components/chat/ChatLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useChat } from '@/contexts/ChatContext';

function ChatPage() {
  const { isLoading } = useChat();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/*" element={<ChatLayout />} />
    </Routes>
  );
}

export default ChatPage;