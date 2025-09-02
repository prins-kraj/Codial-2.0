import React, { useState, useEffect } from 'react';
import { Search, X, MessageCircle, User as UserIcon } from 'lucide-react';
import { User } from '@/types';
import { ApiClient } from '@/utils/api';
import { useDirectMessages } from '@/contexts/DirectMessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import UserAvatar from './UserAvatar';
import UserStatusIndicator from './UserStatusIndicator';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
}

function UserSearch({ isOpen, onClose, onStartChat }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { setActiveConversation } = useDirectMessages();
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search users when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2) {
      searchUsers(debouncedSearchQuery.trim());
    } else {
      setSearchResults([]);
      setError(null);
    }
  }, [debouncedSearchQuery]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen]);

  const searchUsers = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiClient.searchUsers(query);
      
      if (response.success && response.data) {
        // Filter out current user from results
        const filteredResults = response.data.filter(u => u.id !== user?.id);
        setSearchResults(filteredResults);
      } else {
        setError(response.error || 'Failed to search users');
        setSearchResults([]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to search users');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (selectedUser: User) => {
    // Set active conversation and close modal
    setActiveConversation(selectedUser.id);
    onStartChat?.(selectedUser.id);
    onClose();
    
    toast.success(`Started conversation with ${selectedUser.username}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Start New Chat</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users by username or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>
          
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <p className="text-xs text-gray-500 mt-2">
              Type at least 2 characters to search
            </p>
          )}
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <div className="text-red-500 text-sm">{error}</div>
            </div>
          ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <UserIcon className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-sm text-center">
                No users found matching "{searchQuery}"
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {searchResults.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* User avatar with status */}
                      <div className="relative flex-shrink-0">
                        <UserAvatar user={searchUser} size="md" />
                        <div className="absolute -bottom-1 -right-1">
                          <UserStatusIndicator 
                            status={searchUser.status} 
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {searchUser.username}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {searchUser.email}
                        </p>
                        {searchUser.bio && (
                          <p className="text-xs text-gray-400 truncate mt-1">
                            {searchUser.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Start chat button */}
                    <Button
                      onClick={() => handleStartChat(searchUser)}
                      size="sm"
                      className="ml-3 flex-shrink-0"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Search className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-sm text-center">
                Search for users to start a conversation
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Search by username or email address
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserSearch;