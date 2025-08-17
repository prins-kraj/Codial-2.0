import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

function ConnectionStatus() {
  const { isConnected, error } = useChat();

  if (isConnected && !error) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
          ${isConnected 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Connection Error</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Disconnected</span>
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;