import { prisma } from '../config/database';

export class MessageValidation {
  // Check for spam patterns
  static isSpam(content: string, userId: string): boolean {
    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    if (words.length > 5 && uniqueWords.size / words.length < 0.3) {
      return true; // Too much repetition
    }

    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (content.length > 10 && capsCount / content.length > 0.7) {
      return true; // Too many caps
    }

    // Check for excessive special characters
    const specialChars = (content.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialChars > content.length * 0.3) {
      return true; // Too many special characters
    }

    return false;
  }

  // Check rate limiting for user
  static async checkRateLimit(userId: string): Promise<{ allowed: boolean; resetTime?: Date }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Count messages in the last minute
    const recentMessages = await prisma.message.count({
      where: {
        userId: userId,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    });

    const maxMessagesPerMinute = 30;
    
    if (recentMessages >= maxMessagesPerMinute) {
      return {
        allowed: false,
        resetTime: new Date(now.getTime() + 60 * 1000),
      };
    }

    return { allowed: true };
  }

  // Sanitize message content
  static sanitizeContent(content: string): string {
    // Remove excessive whitespace
    let sanitized = content.replace(/\s+/g, ' ').trim();
    
    // Remove potential XSS
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Limit consecutive repeated characters
    sanitized = sanitized.replace(/(.)\1{4,}/g, '$1$1$1$1');
    
    return sanitized;
  }

  // Check for inappropriate content (basic implementation)
  static containsInappropriateContent(content: string): boolean {
    const inappropriateWords = [
      // Add inappropriate words here
      // This is a basic implementation - in production, use a proper content moderation service
    ];

    const lowerContent = content.toLowerCase();
    return inappropriateWords.some(word => lowerContent.includes(word));
  }

  // Validate message before sending
  static async validateMessage(content: string, userId: string, roomId: string): Promise<{
    valid: boolean;
    error?: string;
    sanitizedContent?: string;
  }> {
    // Basic validation
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Message content cannot be empty' };
    }

    if (content.length > 1000) {
      return { valid: false, error: 'Message too long (max 1000 characters)' };
    }

    // Sanitize content
    const sanitizedContent = this.sanitizeContent(content);

    if (sanitizedContent.length === 0) {
      return { valid: false, error: 'Message content is invalid after sanitization' };
    }

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return { 
        valid: false, 
        error: `Rate limit exceeded. Try again after ${rateLimitCheck.resetTime?.toISOString()}` 
      };
    }

    // Check for spam
    if (this.isSpam(sanitizedContent, userId)) {
      return { valid: false, error: 'Message appears to be spam' };
    }

    // Check for inappropriate content
    if (this.containsInappropriateContent(sanitizedContent)) {
      return { valid: false, error: 'Message contains inappropriate content' };
    }

    return { valid: true, sanitizedContent };
  }

  // Check if user can edit/delete message
  static canModifyMessage(message: any, userId: string): { canModify: boolean; reason?: string } {
    if (message.userId !== userId) {
      return { canModify: false, reason: 'You can only modify your own messages' };
    }

    // Check if message is too old to modify (24 hours)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const maxModifyAge = 24 * 60 * 60 * 1000; // 24 hours

    if (messageAge > maxModifyAge) {
      return { canModify: false, reason: 'Message is too old to modify (max 24 hours)' };
    }

    return { canModify: true };
  }
}