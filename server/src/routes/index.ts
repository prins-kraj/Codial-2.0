import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import roomRoutes from './rooms';
import messageRoutes from './messages';
import directMessageRoutes from './directMessages';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API version info
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Real-Time Chat API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      rooms: '/api/rooms',
      messages: '/api/messages',
      directMessages: '/api/direct-messages',
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/messages', messageRoutes);
router.use('/direct-messages', directMessageRoutes);

export default router;