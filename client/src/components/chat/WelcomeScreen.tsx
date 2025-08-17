import React from 'react';
import { MessageCircle, Users, Zap } from 'lucide-react';

function WelcomeScreen() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="mb-8">
          <MessageCircle className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Real-Time Chat
          </h1>
          <p className="text-gray-600">
            Connect with others instantly through our real-time messaging platform
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center space-x-3 text-left">
            <Zap className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <span className="text-gray-700">Real-time messaging</span>
          </div>
          <div className="flex items-center space-x-3 text-left">
            <Users className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <span className="text-gray-700">Multiple chat rooms</span>
          </div>
          <div className="flex items-center space-x-3 text-left">
            <MessageCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <span className="text-gray-700">User presence indicators</span>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Select a room from the sidebar to start chatting, or create a new room to begin a conversation.
        </p>
      </div>
    </div>
  );
}

export default WelcomeScreen;