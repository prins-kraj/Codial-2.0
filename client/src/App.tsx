import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { DirectMessagesProvider } from '@/contexts/DirectMessagesContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import AuthGuard from '@/components/auth/AuthGuard';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ChatPage from '@/pages/ChatPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ErrorHandler from '@/components/ui/ErrorHandler';
import NetworkStatus from '@/components/ui/NetworkStatus';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorHandler>
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
                    <SettingsProvider>
                      <UserProfileProvider>
                        <DirectMessagesProvider>
                          <ChatProvider>
                            <ChatPage />
                            <ConnectionStatus />
                            <NetworkStatus />
                          </ChatProvider>
                        </DirectMessagesProvider>
                      </UserProfileProvider>
                    </SettingsProvider>
                  </AuthGuard>
                }
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/chat" replace />} />
              
              {/* 404 page */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </ErrorHandler>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;