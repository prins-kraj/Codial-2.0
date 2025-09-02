import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, Mail } from 'lucide-react';
import { UserProfile as UserProfileType } from '@/types';
import { ApiClient } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { HelperUtils } from '@/utils/helpers';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import StartChatButton from './StartChatButton';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user: currentUser } = useAuth();

  // Load user profile when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  // Clear data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      setError(null);
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiClient.getUserProfile(userId);

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || 'Failed to load user profile');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleChatStarted = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <ErrorMessage 
                error={error} 
                variant="card" 
                className="mb-4"
                onDismiss={() => setError(null)}
              />
              <Button onClick={loadUserProfile} size="sm">
                Try Again
              </Button>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Profile header */}
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <UserAvatar user={profile} size="lg" />
                  <div className="absolute -bottom-2 -right-2">
                    <UserStatusIndicator status={profile.status} size="md" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {profile.username}
                </h3>

                <p className="text-sm text-gray-500 mb-2">
                  {HelperUtils.getUserStatusText(profile.status)}
                </p>

                {profile.bio && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mt-4">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Profile details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 truncate">
                    {profile.email}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Joined:</span>
                  <span className="text-gray-900">
                    {HelperUtils.formatDate(profile.createdAt)}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Last seen:</span>
                  <span className="text-gray-900">
                    {profile.status === 'ONLINE'
                      ? 'Online now'
                      : HelperUtils.formatRelativeTime(profile.lastSeen)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {currentUser?.id !== profile.id && (
                <div className="pt-4 border-t border-gray-200">
                  <StartChatButton
                    user={profile}
                    className="w-full"
                    onChatStarted={handleChatStarted}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
