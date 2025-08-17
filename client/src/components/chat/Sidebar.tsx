import React, { useState } from 'react';
import { MessageCircle, Plus, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import Button from '@/components/ui/Button';
import UserProfile from './UserProfile';
import RoomList from './RoomList';
import OnlineUsers from './OnlineUsers';
import CreateRoomModal from './CreateRoomModal';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');
  const { user, logout } = useAuth();
  const { rooms, onlineUsers } = useChat();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-8 w-8 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">Chat</h1>
              </div>
              
              {/* Mobile close button */}
              <button
                onClick={onMobileClose}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User profile */}
            {user && <UserProfile user={user} />}
          </div>

          {/* Tab navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`
                  flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'rooms'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Rooms ({rooms.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`
                  flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Online ({onlineUsers.length})
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'rooms' ? (
              <div className="h-full flex flex-col">
                {/* Create room button */}
                <div className="p-4 border-b border-gray-200">
                  <Button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                </div>

                {/* Room list */}
                <div className="flex-1 overflow-y-auto">
                  <RoomList onMobileClose={onMobileClose} />
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <OnlineUsers />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {/* Settings modal */}}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create room modal */}
      {showCreateRoom && (
        <CreateRoomModal
          isOpen={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
        />
      )}
    </>
  );
}

export default Sidebar;