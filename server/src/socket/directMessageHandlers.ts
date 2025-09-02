import { Socket } from 'socket.io';
import { DirectMessageRepository } from '../repositories/DirectMessageRepository';
import { SocketData } from '../types';
import { SocketHelpers } from '../utils/socketHelpers';

export interface SendDirectMessageRequest {
  content: string;
  receiverId: string;
}

export interface EditDirectMessageRequest {
  messageId: string;
  content: string;
}

export interface DeleteDirectMessageRequest {
  messageId: string;
}

export class DirectMessageHandlers {
  private static repository = new DirectMessageRepository();

  /**
   * Handle sending a direct message via socket
   */
  static async handleSendDirectMessage(socket: Socket, data: SendDirectMessageRequest) {
    try {
      const socketData = socket.data as SocketData;
      const { content, receiverId } = data;

      // Validate input
      if (!content || content.trim().length === 0) {
        socket.emit('error', {
          message: 'Message content cannot be empty',
          code: 'INVALID_MESSAGE_CONTENT',
        });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', {
          message: 'Message too long (max 1000 characters)',
          code: 'MESSAGE_TOO_LONG',
        });
        return;
      }

      if (!receiverId) {
        socket.emit('error', {
          message: 'Receiver ID is required',
          code: 'MISSING_RECEIVER_ID',
        });
        return;
      }

      // Prevent users from messaging themselves
      if (receiverId === socketData.userId) {
        socket.emit('error', {
          message: 'Cannot send message to yourself',
          code: 'SELF_MESSAGE_NOT_ALLOWED',
        });
        return;
      }

      // Import validation utility
      const { MessageValidation } = await import('../utils/messageValidation');

      // Validate message content (use 'direct-message' as roomId for direct messages)
      const validation = await MessageValidation.validateMessage(content, socketData.userId, 'direct-message');
      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error,
          code: 'MESSAGE_VALIDATION_ERROR',
        });
        return;
      }

      // Create the direct message
      const message = await DirectMessageHandlers.repository.create({
        content: validation.sanitizedContent!,
        senderId: socketData.userId,
        receiverId,
      });

      // Send message to receiver
      SocketHelpers.sendToUser(receiverId, 'direct_message_received', message);
      
      // Send confirmation to sender
      socket.emit('direct_message_sent', message);

      console.log(`Direct message sent from ${socketData.username} to user ${receiverId}`);
    } catch (error) {
      console.error('Send direct message error:', error);
      socket.emit('error', {
        message: 'Failed to send direct message',
        code: 'SEND_DIRECT_MESSAGE_ERROR',
      });
    }
  }

  /**
   * Handle editing a direct message via socket
   */
  static async handleEditDirectMessage(socket: Socket, data: EditDirectMessageRequest) {
    try {
      const socketData = socket.data as SocketData;
      const { messageId, content } = data;

      // Validate input
      if (!messageId) {
        socket.emit('error', {
          message: 'Message ID is required',
          code: 'MISSING_MESSAGE_ID',
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        socket.emit('error', {
          message: 'Message content cannot be empty',
          code: 'INVALID_MESSAGE_CONTENT',
        });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', {
          message: 'Message too long (max 1000 characters)',
          code: 'MESSAGE_TOO_LONG',
        });
        return;
      }

      // Get the original message for broadcasting
      const originalMessage = await DirectMessageHandlers.repository.findById(messageId);
      if (!originalMessage) {
        socket.emit('error', {
          message: 'Message not found',
          code: 'MESSAGE_NOT_FOUND',
        });
        return;
      }

      // Import validation utility
      const { MessageValidation } = await import('../utils/messageValidation');

      // Validate message content (use 'direct-message' as roomId for direct messages)
      const validation = await MessageValidation.validateMessage(content, socketData.userId, 'direct-message');
      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error,
          code: 'MESSAGE_VALIDATION_ERROR',
        });
        return;
      }

      // Update the message using repository with validation
      const updatedMessage = await DirectMessageHandlers.repository.updateMessage(
        messageId,
        validation.sanitizedContent!,
        socketData.userId
      );

      // Send update to both sender and receiver
      SocketHelpers.sendToUser(originalMessage.receiverId, 'direct_message_edited', updatedMessage);
      socket.emit('direct_message_edited', updatedMessage);

      console.log(`Direct message ${messageId} edited by ${socketData.username}`);
    } catch (error) {
      console.error('Edit direct message error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          socket.emit('error', {
            message: error.message,
            code: 'MESSAGE_NOT_FOUND',
          });
          return;
        }
        
        if (error.message.includes('You can only edit') || error.message.includes('too old')) {
          socket.emit('error', {
            message: error.message,
            code: 'UNAUTHORIZED_MESSAGE_EDIT',
          });
          return;
        }
      }
      
      socket.emit('error', {
        message: 'Failed to edit direct message',
        code: 'EDIT_DIRECT_MESSAGE_ERROR',
      });
    }
  }

  /**
   * Handle deleting a direct message via socket
   */
  static async handleDeleteDirectMessage(socket: Socket, data: DeleteDirectMessageRequest) {
    try {
      const socketData = socket.data as SocketData;
      const { messageId } = data;

      // Validate input
      if (!messageId) {
        socket.emit('error', {
          message: 'Message ID is required',
          code: 'MISSING_MESSAGE_ID',
        });
        return;
      }

      // Get the original message for broadcasting
      const originalMessage = await DirectMessageHandlers.repository.findById(messageId);
      if (!originalMessage) {
        socket.emit('error', {
          message: 'Message not found',
          code: 'MESSAGE_NOT_FOUND',
        });
        return;
      }

      // Delete the message using repository with validation
      await DirectMessageHandlers.repository.deleteMessage(messageId, socketData.userId);

      // Send deletion notification to both sender and receiver
      const deletionData = {
        messageId,
        senderId: originalMessage.senderId,
        receiverId: originalMessage.receiverId,
      };

      SocketHelpers.sendToUser(originalMessage.receiverId, 'direct_message_deleted', deletionData);
      socket.emit('direct_message_deleted', deletionData);

      console.log(`Direct message ${messageId} deleted by ${socketData.username}`);
    } catch (error) {
      console.error('Delete direct message error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Message not found') {
          socket.emit('error', {
            message: error.message,
            code: 'MESSAGE_NOT_FOUND',
          });
          return;
        }
        
        if (error.message.includes('You can only delete')) {
          socket.emit('error', {
            message: error.message,
            code: 'UNAUTHORIZED_MESSAGE_DELETE',
          });
          return;
        }
      }
      
      socket.emit('error', {
        message: 'Failed to delete direct message',
        code: 'DELETE_DIRECT_MESSAGE_ERROR',
      });
    }
  }

  /**
   * Handle joining a direct message conversation (for real-time updates)
   */
  static async handleJoinDirectConversation(socket: Socket, partnerId: string) {
    try {
      const socketData = socket.data as SocketData;

      if (!partnerId) {
        socket.emit('error', {
          message: 'Partner ID is required',
          code: 'MISSING_PARTNER_ID',
        });
        return;
      }

      // Prevent joining conversation with self
      if (partnerId === socketData.userId) {
        socket.emit('error', {
          message: 'Cannot join conversation with yourself',
          code: 'SELF_CONVERSATION_NOT_ALLOWED',
        });
        return;
      }

      // Create a consistent room name for the conversation
      const conversationRoom = [socketData.userId, partnerId].sort().join('-');
      
      // Join the conversation room
      await socket.join(conversationRoom);

      console.log(`User ${socketData.username} joined direct conversation with ${partnerId}`);
    } catch (error) {
      console.error('Join direct conversation error:', error);
      socket.emit('error', {
        message: 'Failed to join conversation',
        code: 'JOIN_CONVERSATION_ERROR',
      });
    }
  }

  /**
   * Handle leaving a direct message conversation
   */
  static async handleLeaveDirectConversation(socket: Socket, partnerId: string) {
    try {
      const socketData = socket.data as SocketData;

      if (!partnerId) {
        return;
      }

      // Create a consistent room name for the conversation
      const conversationRoom = [socketData.userId, partnerId].sort().join('-');
      
      // Leave the conversation room
      await socket.leave(conversationRoom);

      console.log(`User ${socketData.username} left direct conversation with ${partnerId}`);
    } catch (error) {
      console.error('Leave direct conversation error:', error);
    }
  }
}