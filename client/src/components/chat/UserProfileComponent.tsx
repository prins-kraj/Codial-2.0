import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Save, Camera, Mail, Calendar, Clock, User } from 'lucide-react';
import { UserProfile as UserProfileType, UpdateProfileRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { HelperUtils } from '@/utils/helpers';
import { cn } from '@/utils/cn';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import StartChatButton from './StartChatButton';

interface UserProfileComponentProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onChatStarted?: () => void;
}

function UserProfileComponent({
  userId,
  isOpen,
  onClose,
  onChatStarted,
}: UserProfileComponentProps) {
  // console.log('UserProfileComponent rendered:', { userId, isOpen });
  const { user: currentUser } = useAuth();
  const {
    loadProfile,
    updateProfile,
    uploadProfilePicture,
    getCachedProfile,
    isLoading,
    error,
    clearError,
  } = useUserProfile();

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = currentUser?.id === userId;

  // Load profile when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  // Clear data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      setIsEditing(false);
      setFormErrors({});
      clearError();
    }
  }, [isOpen, clearError]);

  const loadUserProfile = async () => {
    // Check cache first
    const cachedProfile = getCachedProfile(userId);
    if (cachedProfile) {
      setProfile(cachedProfile);
      setEditForm({
        bio: cachedProfile.bio || '',
      });
    }

    // Load fresh data
    const freshProfile = await loadProfile(userId);
    if (freshProfile) {
      setProfile(freshProfile);
      setEditForm({
        bio: freshProfile.bio || '',
      });
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditForm({
        bio: profile?.bio || '',
      });
      setFormErrors({});
    }
    setIsEditing(!isEditing);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Bio validation (optional, but limit length)
    if (editForm.bio && editForm.bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    const updateData: UpdateProfileRequest = {};

    // Only include changed fields
    if (editForm.bio !== (profile?.bio || '')) {
      updateData.bio = editForm.bio || undefined;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      setIsEditing(false);
      return;
    }

    const success = await updateProfile(updateData);
    if (success) {
      setIsEditing(false);
      // Reload profile to get updated data
      await loadUserProfile();
    }
  };

  const handleProfilePictureClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfilePictureChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPicture(true);
    const success = await uploadProfilePicture(file);

    if (success) {
      // Reload profile to get updated picture
      await loadUserProfile();
    }

    setIsUploadingPicture(false);

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChatStart = () => {
    onChatStarted?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOwnProfile ? 'My Profile' : 'User Profile'}
      size="md"
    >
      {isLoading && !profile ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error && !profile ? (
        <div className="text-center py-12">
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <Button onClick={loadUserProfile} size="sm">
            Try Again
          </Button>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              {/* Profile Picture */}
              <div
                className={cn(
                  'relative',
                  isOwnProfile && 'cursor-pointer group'
                )}
                onClick={handleProfilePictureClick}
              >
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.username}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <UserAvatar user={profile} size="lg" />
                )}

                {/* Upload overlay for own profile */}
                {isOwnProfile && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingPicture ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                )}

                {/* Status indicator */}
                <div className="absolute -bottom-2 -right-2">
                  <UserStatusIndicator status={profile.status} size="md" />
                </div>
              </div>

              {/* Hidden file input */}
              {isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              )}
            </div>

            {/* Username and Status */}
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {profile.username}
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              {HelperUtils.getUserStatusText(profile.status)}
            </p>

            {/* Edit/Save buttons for own profile */}
            {isOwnProfile && (
              <div className="flex justify-center space-x-2 mb-4">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      disabled={isLoading}
                      isLoading={isLoading}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={handleEditToggle}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleEditToggle}
                    variant="outline"
                    size="sm"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bio Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Bio</span>
            </div>

            {isEditing && isOwnProfile ? (
              <div>
                <textarea
                  value={editForm.bio}
                  onChange={e => handleFormChange('bio', e.target.value)}
                  placeholder="Tell others about yourself..."
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    formErrors.bio ? 'border-red-300' : 'border-gray-300'
                  )}
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.bio && (
                    <p className="text-sm text-red-600">{formErrors.bio}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {editForm.bio.length}/500
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 min-h-[60px]">
                {profile.bio ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    {isOwnProfile
                      ? 'Add a bio to tell others about yourself'
                      : 'No bio available'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">Email:</span>
              <span className="text-gray-900 truncate">{profile.email}</span>
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

          {/* Actions for other users */}
          {!isOwnProfile && (
            <div className="pt-4 border-t border-gray-200">
              <StartChatButton
                user={profile}
                className="w-full"
                onChatStarted={handleChatStart}
              />
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export default UserProfileComponent;
