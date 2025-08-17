import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../utils/auth';

// Mock dependencies
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
  redis: {
    connect: jest.fn(),
    ping: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Auth Utils', () => {
  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = AuthUtils.validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = AuthUtils.validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = AuthUtils.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', () => {
      const result = AuthUtils.validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = AuthUtils.validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = AuthUtils.validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = AuthUtils.validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(AuthUtils.validateEmail('test@example.com')).toBe(true);
      expect(AuthUtils.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(AuthUtils.validateEmail('invalid-email')).toBe(false);
      expect(AuthUtils.validateEmail('test@')).toBe(false);
      expect(AuthUtils.validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should validate correct username', () => {
      const result = AuthUtils.validateUsername('validuser123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short username', () => {
      const result = AuthUtils.validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be at least 3 characters long');
    });

    it('should reject long username', () => {
      const result = AuthUtils.validateUsername('a'.repeat(21));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be no more than 20 characters long');
    });

    it('should reject invalid characters', () => {
      const result = AuthUtils.validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should reject username starting with underscore', () => {
      const result = AuthUtils.validateUsername('_username');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username cannot start or end with underscore or hyphen');
    });

    it('should reject username ending with hyphen', () => {
      const result = AuthUtils.validateUsername('username-');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username cannot start or end with underscore or hyphen');
    });
  });

  describe('JWT operations', () => {
    const testPayload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    it('should generate and verify token', () => {
      const token = AuthUtils.generateToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = AuthUtils.verifyToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        AuthUtils.verifyToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid header', () => {
      const token = AuthUtils.extractTokenFromHeader('Bearer valid-token');
      expect(token).toBe('valid-token');
    });

    it('should return null for invalid header', () => {
      expect(AuthUtils.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(AuthUtils.extractTokenFromHeader(undefined)).toBeNull();
      expect(AuthUtils.extractTokenFromHeader('')).toBeNull();
    });
  });

  describe('password hashing', () => {
    it('should hash and compare password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthUtils.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await AuthUtils.comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await AuthUtils.comparePassword('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });
  });
});