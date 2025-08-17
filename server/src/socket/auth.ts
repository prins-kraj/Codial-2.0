import { Socket } from 'socket.io';
import { AuthUtils } from '../utils/auth';
import { prisma } from '../config/database';
import { JwtPayload, SocketData } from '../types';

// Socket.io authentication middleware
export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Extract token from handshake auth
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded: JwtPayload = AuthUtils.verifyToken(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user data to socket
    socket.data = {
      userId: user.id,
      username: user.username,
    } as SocketData;

    // Update user status to online
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};