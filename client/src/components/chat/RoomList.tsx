import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Hash, Lock, Users, MessageSquare } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { HelperUtils } from '@/utils/helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RoomListProps {
  onMobileClose?: () => void;
}

function RoomList({ onMobileClose }: RoomListProps) {
  const { rooms, isLoading, joinRoom } = useChat();
  const navigate = useNavigate();
  const { roomId: currentRoomId } = useParams();

  const handleRoomClick = async (roomId: string) => {
    try {
      await joinRoom(roomId);
      navigate(`/chat/room/${roomId}`);
      onMobileClose?.();
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="p-4 text-center">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No rooms available</p>
        <p className="text-gray-400 text-xs mt-1">
          Create a room to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {rooms.map((room) => {
        const isActive = currentRoomId === room.id;
        const hasUnreadMessages = false; // TODO: Implement unread message logic

        return (
          <button
            key={room.id}
            onClick={() => handleRoomClick(room.id)}
            className={`
              w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-r-2
              ${isActive 
                ? 'bg-primary-50 border-primary-500 text-primary-700' 
                : 'border-transparent text-gray-700 hover:text-gray-900'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {room.isPrivate ? (
                  <Lock className="h-5 w-5 text-gray-400" />
                ) : (
                  <Hash className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${
                    isActive ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {room.name}
                  </p>
                  {hasUnreadMessages && (
                    <div className="h-2 w-2 bg-primary-500 rounded-full" />
                  )}
                </div>
                
                {room.description && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {room.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <Users className="h-3 w-3" />
                    <span>{HelperUtils.formatNumber(room.memberCount)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <MessageSquare className="h-3 w-3" />
                    <span>{HelperUtils.formatNumber(room.messageCount)}</span>
                  </div>
                  
                  {room.updatedAt && (
                    <span className="text-xs text-gray-400">
                      {HelperUtils.formatRelativeTime(room.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default RoomList;