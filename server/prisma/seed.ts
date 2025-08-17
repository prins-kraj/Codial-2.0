import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      status: 'ONLINE',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
      status: 'ONLINE',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: hashedPassword,
      status: 'AWAY',
    },
  });

  console.log('✅ Created test users');

  // Create test rooms
  const generalRoom = await prisma.room.upsert({
    where: { id: 'general-room' },
    update: {},
    create: {
      id: 'general-room',
      name: 'General',
      description: 'General discussion room for everyone',
      isPrivate: false,
      createdBy: user1.id,
    },
  });

  const techRoom = await prisma.room.upsert({
    where: { id: 'tech-room' },
    update: {},
    create: {
      id: 'tech-room',
      name: 'Tech Talk',
      description: 'Discuss technology, programming, and development',
      isPrivate: false,
      createdBy: user2.id,
    },
  });

  const randomRoom = await prisma.room.upsert({
    where: { id: 'random-room' },
    update: {},
    create: {
      id: 'random-room',
      name: 'Random',
      description: 'Random conversations and off-topic discussions',
      isPrivate: false,
      createdBy: user3.id,
    },
  });

  console.log('✅ Created test rooms');

  // Add users to rooms
  await prisma.userRoom.createMany({
    data: [
      { userId: user1.id, roomId: generalRoom.id },
      { userId: user2.id, roomId: generalRoom.id },
      { userId: user3.id, roomId: generalRoom.id },
      { userId: user1.id, roomId: techRoom.id },
      { userId: user2.id, roomId: techRoom.id },
      { userId: user2.id, roomId: randomRoom.id },
      { userId: user3.id, roomId: randomRoom.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Added users to rooms');

  // Create some sample messages
  await prisma.message.createMany({
    data: [
      {
        content: 'Welcome to the general chat room! 👋',
        userId: user1.id,
        roomId: generalRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        content: 'Hey everyone! Great to be here.',
        userId: user2.id,
        roomId: generalRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      },
      {
        content: 'Anyone working on interesting projects lately?',
        userId: user3.id,
        roomId: generalRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      },
      {
        content: 'Let\'s discuss the latest in web development!',
        userId: user2.id,
        roomId: techRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      },
      {
        content: 'I\'ve been exploring React 18 features recently.',
        userId: user1.id,
        roomId: techRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
      },
      {
        content: 'What\'s everyone up to this weekend?',
        userId: user3.id,
        roomId: randomRoom.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      },
    ],
  });

  console.log('✅ Created sample messages');
  console.log('🎉 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });