import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Redis Client
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Initialize database connections
export async function initializeDatabase() {
  try {
    // Test Prisma connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');

    // Connect to Redis
    await redis.connect();
    console.log('✅ Connected to Redis');

    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connection verified');

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  try {
    await prisma.$disconnect();
    await redis.quit();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

// Handle process termination
process.on('SIGINT', closeDatabaseConnections);
process.on('SIGTERM', closeDatabaseConnections);