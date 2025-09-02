import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { UserProfileState, UserProfile, UpdateProfileRequest } from '@/types';
import { ApiClient } from '@/utils/api';
import { socketManager } from '@/utils/socket';
import { SOCKET_EVENTS } from '@/config/constants';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// User Profile actions
type UserProfileAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROFILE'; payload: { userId: string; profile: UserProfile } }
  | { type: 'SET_CURRENT_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile }
  | { type: 'CLEAR_PROFILES' };

// User Profile reducer
function userProfileReducer(state: UserProfileState, action: UserProfileAction): UserProfileState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PROFILE':
      return {
        ...state,
        profiles: {
          ...state.profiles,
          [action.payload.userId]: action.payload.profile,
        },
      };
    case 'SET_CURRENT_PROFILE':
      return { ...state, currentProfile: action.payload };
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    case 'UPDATE_PROFILE':
      const updatedProfiles = { ...state.profiles };
      updatedProfiles[action.payload.id] = action.payload;
      
      return {
        ...state,
        profiles: updatedProfiles,
        currentProfile: state.currentProfile?.id === action.payload.id 
          ? action.payload 
          : state.currentProfile,
      };
    case 'CLEAR_PROFILES':
      return {
        ...state,
        profiles: {},
        currentProfile: null,
        isEditing: false,
      };
    default:
      return state;
  }
}

// Initial state
const initialState: UserProfileState = {
  profiles: {},
  currentProfile: null,
  isEditing: false,
  isLoading: false,
  error: null,
};

// User Profile context
interface UserProfileContextType extends UserProfileState {
  // Profile management
  loadProfile: (userId: string) => Promise<UserProfile | null>;
  updateProfile: (data: UpdateProfileRequest) => Promise<boolean>;
  uploadProfilePicture: (file: File) => Promise<boolean>;
  
  // UI state management
  setCurrentProfile: (profile: UserProfile | null) => void;
  setEditing: (editing: boolean) => void;
  
  // Utility
  clearError: () => void;
  getCachedProfile: (userId: string) => UserProfile | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// User Profile provider
export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userProfileReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Clear profiles when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'CLEAR_PROFILES' });
    }
  }, [isAuthenticated]);

  // Socket event handlers for profile updates
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    // Profile update events
    const handleUserProfileUpdated = (profile: UserProfile) => {
      dispatch({ type: 'UPDATE_PROFILE', payload: profile });
      
      // Show notification if it's not the current user
      if (profile.id !== user?.id) {
        toast(`${profile.username} updated their profile`, {
          icon: '👤',
          duration: 3000,
        });
      }
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);

    return () => {
      // Clean up event listeners
      socket.off(SOCKET_EVENTS.USER_PROFILE_UPDATED, handleUserProfileUpdated);
    };
  }, [user]);

  // Load user profile
  const loadProfile = async (userId: string): Promise<UserProfile | null> => {
    // Check if profile is already cached
    if (state.profiles[userId]) {
      return state.profiles[userId];
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.getUserProfile(userId);
      
      if (response.success && response.data) {
        dispatch({
          type: 'SET_PROFILE',
          payload: { userId, profile: response.data },
        });
        return response.data;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load profile' });
        return null;
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load profile' });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user profile
  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.updateUserProfile(data);
      
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_PROFILE', payload: response.data });
        dispatch({ type: 'SET_EDITING', payload: false });
        
        // Broadcast profile update via socket
        const socket = socketManager.getSocket();
        if (socket) {
          socket.emit(SOCKET_EVENTS.USER_PROFILE_UPDATED, response.data);
        }
        
        toast.success('Profile updated successfully');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to update profile' });
        toast.error(response.error || 'Failed to update profile');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async (file: File): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to upload a profile picture');
      return false;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Profile picture must be less than 5MB');
      return false;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Profile picture must be a JPEG, PNG, GIF, or WebP image');
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await ApiClient.uploadProfilePicture(file);
      
      if (response.success && response.data) {
        // Update profile with new picture URL
        const updatedProfile = {
          ...state.profiles[user.id],
          profilePicture: response.data.profilePicture,
        } as UserProfile;
        
        dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
        
        // Broadcast profile update via socket
        const socket = socketManager.getSocket();
        if (socket) {
          socket.emit(SOCKET_EVENTS.USER_PROFILE_UPDATED, updatedProfile);
        }
        
        toast.success('Profile picture updated successfully');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to upload profile picture' });
        toast.error(response.error || 'Failed to upload profile picture');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload profile picture';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Set current profile being viewed
  const setCurrentProfile = (profile: UserProfile | null) => {
    dispatch({ type: 'SET_CURRENT_PROFILE', payload: profile });
  };

  // Set editing state
  const setEditing = (editing: boolean) => {
    dispatch({ type: 'SET_EDITING', payload: editing });
  };

  // Get cached profile
  const getCachedProfile = (userId: string): UserProfile | null => {
    return state.profiles[userId] || null;
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: UserProfileContextType = {
    ...state,
    loadProfile,
    updateProfile,
    uploadProfilePicture,
    setCurrentProfile,
    setEditing,
    clearError,
    getCachedProfile,
  };

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
}

// Custom hook to use user profile context
export function useUserProfile(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}