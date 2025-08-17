const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

async function testConnections() {
  console.log('Testing database connections...');
  
  // Test PostgreSQL
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
  }
  
  // Test Redis
  try {
    const redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redis.connect();
    await redis.ping();
    console.log('✅ Redis connected successfully');
    await redis.quit();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  }
}

testConnections();