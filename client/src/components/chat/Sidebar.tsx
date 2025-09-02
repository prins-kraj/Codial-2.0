import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useDirectMessages } from '@/contexts/DirectMessagesContext';
import { socketManager } from '@/utils/socket';
import { SOCKET_EVENTS } from '@/config/constants';
import { UserProfile as UserProfileType } from '@/types';
import Button from '@/components/ui/Button';
import UserProfile from './UserProfile';
import UserProfileComponent from './UserProfileComponent';
import RoomList from './RoomList';
import OnlineUsers from './OnlineUsers';
import DirectMessagesList from './DirectMessagesList';
import CreateRoomModal from './CreateRoomModal';
import SettingsModal from './SettingsModal';
// import UserProfile from './UserProfile';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'rooms' | 'direct-messages' | 'users'
  >('rooms');
  const { user, logout } = useAuth();
  const { rooms, onlineUsers } = useChat();
  const { conversations, getTotalUnreadCount } = useDirectMessages();
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useSettings();

  // Socket event listeners for real-time updates
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleUserStatusChanged = (data: {
      userId: string;
      status: string;
    }) => {
      // The contexts will handle updating user status in their respective states
      // This component just needs to listen to trigger re-renders
    };

    const handleUserProfileUpdated = (profile: UserProfileType) => {
      // The contexts will handle updating user profile in their respective states
      // This component just needs to listen to trigger re-renders
    };

    const handleDirectMessageReceived = () => {
      // The DirectMessages context will handle updating unread counts
      // This component just needs to listen to trigger re-renders
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
    socket.on(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);
    socket.on(
      SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
      handleDirectMessageReceived
    );

    // Cleanup event listeners
    return () => {
      socket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      socket.off(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE_RECEIVED,
        handleDirectMessageReceived
      );
    };
  }, []);

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
            {user && (
              <button
                onClick={() => {
                  console.log('Sidebar: Profile button clicked');
                  setShowProfile(true);
                }}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
              >
                <UserProfile user={user} />
              </button>
            )}
          </div>

          {/* Tab navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`
                  flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'rooms'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Rooms ({rooms.length})
              </button>
              <button
                onClick={() => setActiveTab('direct-messages')}
                className={`
                  flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors relative
                  ${
                    activeTab === 'direct-messages'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                DMs ({conversations.length})
                {getTotalUnreadCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {getTotalUnreadCount() > 99 ? '99+' : getTotalUnreadCount()}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`
                  flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'users'
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
            {activeTab === 'rooms' && (
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
            )}

            {activeTab === 'direct-messages' && (
              <div className="h-full">
                <DirectMessagesList onMobileClose={onMobileClose} />
              </div>
            )}

            {activeTab === 'users' && (
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
                onClick={() => {
                  console.log('Sidebar: Settings button clicked');
                  console.log(
                    'Sidebar: isSettingsOpen before:',
                    isSettingsOpen
                  );
                  openSettings();
                  console.log('Sidebar: openSettings called');
                }}
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

      {/* User Profile Modal */}
      {user && (
        <UserProfileComponent
          userId={user.id}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  );
}

export default Sidebar;
