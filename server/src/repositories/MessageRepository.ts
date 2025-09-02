import { prisma } from '../config/database';
import { Message, User, Room } from '@prisma/client';

export interface MessageWithUser extends Omit<Message, 'editHistory'> {
  user: {
    id: string;
    username: string;
  };
  editHistory?: MessageEditHistory[] | null;
}

export interface MessageWithDetails extends Omit<Message, 'editHistory'> {
  user: {
    id: string;
    username: string;
  };
  room: {
    id: string;
    name: string;
    isPrivate: boolean;
  };
  editHistory?: MessageEditHistory[] | null;
}

export interface MessageEditHistory {
  content: string;
  editedAt: string;
}

export class MessageRepository {
  /**
   * Create a new message
   */
  async create(data: {
    content: string;
    userId: string;
    roomId: string;
  }): Promise<MessageWithUser> {
    return (await prisma.message.create({
      data: {
        content: data.content.trim(),
        userId: data.userId,
        roomId: data.roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })) as unknown as MessageWithUser;
  }

  /**
   * Find a message by ID
   */
  async findById(messageId: string): Promise<MessageWithUser | null> {
    return (await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })) as unknown as MessageWithUser | null;
  }

  /**
   * Find a message by ID with full details
   */
  async findByIdWithDetails(
    messageId: string
  ): Promise<MessageWithDetails | null> {
    return (await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
          },
        },
      },
    })) as unknown as MessageWithDetails | null;
  }

  /**
   * Update a message with edit functionality
   */
  async updateMessage(
    messageId: string,
    content: string,
    userId: string
  ): Promise<MessageWithUser> {
    // First get the current message to store in edit history
    const currentMessage = await this.findById(messageId);
    if (!currentMessage) {
      throw new Error('Message not found');
    }

    // Verify ownership
    if (currentMessage.userId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = Date.now() - currentMessage.createdAt.getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageAge > maxEditAge) {
      throw new Error('Message is too old to edit (max 24 hours)');
    }

    // Prepare edit history
    let editHistory: MessageEditHistory[] = [];
    if (currentMessage.editHistory) {
      editHistory = Array.isArray(currentMessage.editHistory)
        ? (currentMessage.editHistory as MessageEditHistory[])
        : [];
    }

    // Add current content to edit history if this is the first edit
    if (!currentMessage.editedAt) {
      editHistory.push({
        content: currentMessage.content,
        editedAt: currentMessage.createdAt.toISOString(),
      });
    }

    // Update the message
    return (await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
        editHistory:
          editHistory.length > 0
            ? JSON.parse(JSON.stringify(editHistory))
            : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })) as unknown as MessageWithUser;
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // First verify the message exists and ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '[Message deleted]',
      },
    });
  }

  /**
   * Hard delete a message (permanent removal)
   */
  async hardDeleteMessage(messageId: string, userId: string): Promise<void> {
    // First verify the message exists and ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    // Permanently delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });
  }

  /**
   * Validate message ownership
   */
  async validateOwnership(messageId: string, userId: string): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true },
    });

    return message?.userId === userId;
  }

  /**
   * Check if message can be edited (within time limit)
   */
  async canEdit(messageId: string): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { createdAt: true },
    });

    if (!message) {
      return false;
    }

    const messageAge = Date.now() - message.createdAt.getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    return messageAge <= maxEditAge;
  }

  /**
   * Search messages with filters
   */
  async searchMessages(params: {
    query: string;
    roomIds?: string[];
    userId?: string;
    limit?: number;
    page?: number;
  }): Promise<MessageWithDetails[]> {
    const { query, roomIds, userId, limit = 20, page = 1 } = params;

    const whereConditions: any = {
      content: {
        contains: query.trim(),
        mode: 'insensitive',
      },
      isDeleted: false, // Don't include deleted messages in search
    };

    if (roomIds && roomIds.length > 0) {
      whereConditions.roomId = {
        in: roomIds,
      };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    return (await prisma.message.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50), // Max 50 results per request
      skip: (page - 1) * limit,
    })) as unknown as MessageWithDetails[];
  }

  /**
   * Get messages for a room with pagination
   */
  async getMessagesByRoom(
    roomId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<MessageWithUser[]> {
    const whereConditions: any = {
      roomId: roomId,
      isDeleted: false, // Don't include deleted messages
    };

    if (cursor) {
      whereConditions.id = {
        lt: cursor,
      };
    }

    return (await prisma.message.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })) as unknown as MessageWithUser[];
  }
}
