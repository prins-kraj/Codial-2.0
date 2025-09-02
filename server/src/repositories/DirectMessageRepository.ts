import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// Get the DirectMessage type from Prisma
type DirectMessage = Prisma.DirectMessageGetPayload<{}>;

export interface DirectMessageWithUsers extends DirectMessage {
  sender: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  receiver: {
    id: string;
    username: string;
    profilePicture?: string;
  };
}

export interface DirectConversation {
  participantId: string;
  participant: {
    id: string;
    username: string;
    profilePicture?: string;
    status: string;
  };
  lastMessage?: DirectMessageWithUsers;
  unreadCount: number;
  lastActivity: Date;
}

export class DirectMessageRepository {
  /**
   * Create a new direct message
   */
  async create(data: {
    content: string;
    senderId: string;
    receiverId: string;
  }): Promise<DirectMessageWithUsers> {
    return await prisma.directMessage.create({
      data,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  /**
   * Find direct message by ID
   */
  async findById(id: string): Promise<DirectMessageWithUsers | null> {
    return await prisma.directMessage.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  /**
   * Get messages between two users
   */
  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    options: {
      limit?: number;
      offset?: number;
      before?: Date;
    } = {}
  ): Promise<DirectMessageWithUsers[]> {
    const { limit = 50, offset = 0, before } = options;

    const whereCondition: Prisma.DirectMessageWhereInput = {
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
      isDeleted: false,
    };

    if (before) {
      whereCondition.createdAt = { lt: before };
    }

    return await prisma.directMessage.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<DirectConversation[]> {
    // Get all direct messages where user is sender or receiver
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            status: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group messages by conversation partner
    const conversationsMap = new Map<string, DirectConversation>();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const partner =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          participantId: partnerId,
          participant: partner,
          lastMessage: message as DirectMessageWithUsers,
          unreadCount: 0,
          lastActivity: message.createdAt,
        });
      }

      // Count unread messages (messages sent to this user that are newer than their last read)
      if (message.receiverId === userId) {
        const conversation = conversationsMap.get(partnerId)!;
        conversation.unreadCount++;
      }
    }

    return Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  /**
   * Update a direct message with ownership validation
   */
  async updateMessage(
    messageId: string,
    content: string,
    userId: string
  ): Promise<DirectMessageWithUsers> {
    // First get the current message to validate ownership
    const currentMessage = await this.findById(messageId);
    if (!currentMessage) {
      throw new Error('Message not found');
    }

    // Verify ownership (only sender can edit)
    if (currentMessage.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = Date.now() - currentMessage.createdAt.getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageAge > maxEditAge) {
      throw new Error('Message is too old to edit (max 24 hours)');
    }

    // Update the message
    return await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  /**
   * Delete a direct message with ownership validation
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // First verify the message exists and ownership
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    // Soft delete the message
    await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '[Message deleted]',
      },
    });
  }

  /**
   * Update a direct message (internal method)
   */
  async update(
    id: string,
    data: {
      content?: string;
      editedAt?: Date;
      isDeleted?: boolean;
    }
  ): Promise<DirectMessageWithUsers | null> {
    return await prisma.directMessage.update({
      where: { id },
      data,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete a direct message
   */
  async delete(id: string): Promise<DirectMessageWithUsers | null> {
    return await this.update(id, {
      isDeleted: true,
    });
  }

  /**
   * Hard delete a direct message (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    await prisma.directMessage.delete({
      where: { id },
    });
  }

  /**
   * Get unread message count between two users
   */
  async getUnreadCount(userId: string, partnerId: string): Promise<number> {
    return await prisma.directMessage.count({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isDeleted: false,
        // In a real implementation, you'd track read status
        // For now, we'll assume all messages are unread
      },
    });
  }

  /**
   * Mark messages as read (placeholder for future implementation)
   */
  async markAsRead(userId: string, partnerId: string): Promise<void> {
    // This would update a read status field in the future
    // For now, this is a placeholder
    console.log(
      `Marking messages as read for user ${userId} from ${partnerId}`
    );
  }

  /**
   * Search direct messages
   */
  async searchMessages(
    userId: string,
    query: string,
    options: {
      partnerId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<DirectMessageWithUsers[]> {
    const { partnerId, limit = 20, offset = 0 } = options;

    const whereCondition: Prisma.DirectMessageWhereInput = {
      OR: [{ senderId: userId }, { receiverId: userId }],
      content: {
        contains: query,
        mode: 'insensitive',
      },
      isDeleted: false,
    };

    if (partnerId) {
      whereCondition.OR = [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ];
    }

    return await prisma.directMessage.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
