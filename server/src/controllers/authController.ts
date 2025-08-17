import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';
import { RegisterRequest, LoginRequest, AuthResponse, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  // Registration validation rules
  static registerValidation = [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
      .custom((value: string) => {
        if (/^[_-]/.test(value) || /[_-]$/.test(value)) {
          throw new Error('Username cannot start or end with underscore or hyphen');
        }
        return true;
      }),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ];

  // Login validation rules
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ];

  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { username, email, password }: RegisterRequest = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username },
          ],
        },
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        res.status(409).json({
          success: false,
          error: `User with this ${field} already exists`,
        });
        return;
      }

      // Hash password
      const passwordHash = await AuthUtils.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          status: 'OFFLINE',
        },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            status: user.status,
          },
          token,
        },
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(password, user.passwordHash);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Update last seen
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeen: new Date(),
          status: 'ONLINE',
        },
      });

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            status: 'ONLINE',
          },
          token,
        },
        message: 'Login successful',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  // Logout user
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Update user status to offline
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          status: 'OFFLINE',
          lastSeen: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  // Get current user info
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          createdAt: true,
          lastSeen: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  // Refresh token
  static async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Generate new token
      const token = AuthUtils.generateToken({
        userId: req.user.id,
        username: req.user.username,
        email: req.user.email,
      });

      res.status(200).json({
        success: true,
        data: { token },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}