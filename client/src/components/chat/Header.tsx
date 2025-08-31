import React from 'react';
import { Hash, Lock, Users, MoreVertical } from 'lucide-react';
import { Room } from '@/types';
// import { HelperUtils } from '@/utils/helpers';
import Button from '@/components/ui/Button';

interface HeaderProps {
  room: Room;
  onlineCount?: number;
}

function Header({ room, onlineCount }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {room.isPrivate ? (
              <Lock className="h-6 w-6 text-gray-400" />
            ) : (
              <Hash className="h-6 w-6 text-gray-400" />
            )}
          </div>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {room.name}
            </h1>
            {room.description && (
              <p className="text-sm text-gray-500 mt-1">
                {room.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Room stats */}
          <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              {/* <span>{HelperUtils.formatNumber(room.memberCount)} members</span> */}
            </div>
            
            {onlineCount !== undefined && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                {/* <span>{HelperUtils.formatNumber(onlineCount)} online</span> */}
              </div>
            )}
          </div>

          {/* Room menu */}
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Header;