import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import AuthGuard from '@/components/auth/AuthGuard';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ChatPage from '@/pages/ChatPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ConnectionStatus from '@/components/ui/ConnectionStatus';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route
            path="/chat/*"
            element={
              <AuthGuard>
                <ChatProvider>
                  <ChatPage />
                  <ConnectionStatus />
                </ChatProvider>
              </AuthGuard>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;