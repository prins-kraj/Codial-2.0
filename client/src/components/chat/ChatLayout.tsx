import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatRoom from './ChatRoom';
import WelcomeScreen from './WelcomeScreen';
import Button from '@/components/ui/Button';

function ChatLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-white">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block w-80 border-r border-gray-200 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {isMobileSidebarOpen && 
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />}

      {/* Main content */}
      <div className="flex-1 flex flex-col pt-16 lg:pt-0">
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/room/:roomId" element={<ChatRoom />} />
        </Routes>
      </div>
    </div>
  );
}

export default ChatLayout;