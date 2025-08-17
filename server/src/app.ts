import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import middleware
import { 
  generalLimiter, 
  securityHeaders, 
  corsOptions, 
  sanitizeInput, 
  requestLogger 
} from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import apiRoutes from './routes';

// Import database
import { initializeDatabase } from './config/database';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware
app.use(requestLogger);
app.use(sanitizeInput);
app.use(generalLimiter);

// API routes
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.IO
import { initializeSocket } from './socket';
import { SocketHelpers } from './utils/socketHelpers';

initializeSocket(io);
SocketHelpers.setIO(io);

export { app, server, io };

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connections
    await initializeDatabase();
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
// if (require.main === module) {
//   startServer();
// }

startServer();