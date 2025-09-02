import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { User } from '@/types';
import { useDirectMessages } from '@/contexts/DirectMessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface StartChatButtonProps {
  user: User;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onChatStarted?: () => void;
}

function StartChatButton({ 
  user, 
  variant = 'primary', 
  size = 'md', 
  className,
  onChatStarted 
}: StartChatButtonProps) {
  const { user: currentUser } = useAuth();
  const { setActiveConversation } = useDirectMessages();
  const navigate = useNavigate();

  const handleStartChat = () => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to start a chat');
        return;
      }

      if (user.id === currentUser.id) {
        toast.error('You cannot start a chat with yourself');
        return;
      }

      // Set active conversation
      setActiveConversation(user.id);
      
      // Navigate to the direct message chat
      navigate(`/chat/dm/${user.id}`);
      
      // Call callback if provided
      onChatStarted?.();
      
      toast.success(`Started conversation with ${user.username}`);
    } catch (error) {
      console.error('StartChatButton: Error in handleStartChat:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  // Don't show button for current user
  if (user.id === currentUser?.id) {
    return null;
  }

  return (
    <Button
      onClick={handleStartChat}
      variant={variant}
      size={size}
      className={className}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Start Chat
    </Button>
  );
}

export default StartChatButton;