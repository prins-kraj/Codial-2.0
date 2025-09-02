import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Client } from 'socket.io-client';
import app from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Direct Messaging Integration Tests', () => {
  let server: any;
  let io: Server;
  let clientSocket1: any;
  let clientSocket2: any;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Create HTTP server
    const httpServer = createServer(app);
    server = httpServer.listen(0);
    
    // Initialize Socket.IO
    io = new Server(server, {
      cors: { origin: "*" }
    });

    // Clean up database
    await prisma.directMessage.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.directMessage.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    if (server) server.close();
  });

  beforeEach(async () => {
    // Create test users
    const user1Response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123'
      });

    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      });

    user1Token = user1Response.body.token;
    user2Token = user2Response.body.token;
    user1Id = user1Response.body.user.id;
    user2Id = user2Response.body.user.id;
  });

  afterEach(async () => {
    await prisma.directMessage.deleteMany();
    await prisma.user.deleteMany();
    
    if (clientSocket1) {
      clientSocket1.disconnect();
      clientSocket1 = null;
    }
    if (clientSocket2) {
      clientSocket2.disconnect();
      clientSocket2 = null;
    }
  });

  describe('Complete Direct Messaging Workflow', () => {
    test('should handle complete direct messaging flow', async () => {
      // 1. Send initial direct message via API
      const messageResponse = await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'Hello from user1!'
        });

      expect(messageResponse.status).toBe(201);
      expect(messageResponse.body.content).toBe('Hello from user1!');
      expect(messageResponse.body.senderId).toBe(user1Id);
      expect(messageResponse.body.receiverId).toBe(user2Id);

      // 2. Get conversation list for user2
      const conversationsResponse = await request(app)
        .get('/api/direct-messages')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(conversationsResponse.status).toBe(200);
      expect(conversationsResponse.body).toHaveLength(1);
      expect(conversationsResponse.body[0].participant.id).toBe(user1Id);
      expect(conversationsResponse.body[0].unreadCount).toBe(1);

      // 3. Get messages in conversation
      const messagesResponse = await request(app)
        .get(`/api/direct-messages/${user1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(messagesResponse.status).toBe(200);
      expect(messagesResponse.body.messages).toHaveLength(1);
      expect(messagesResponse.body.messages[0].content).toBe('Hello from user1!');

      // 4. Reply to the message
      const replyResponse = await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          receiverId: user1Id,
          content: 'Hello back from user2!'
        });

      expect(replyResponse.status).toBe(201);

      // 5. Verify conversation updated for user1
      const user1ConversationsResponse = await request(app)
        .get('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1ConversationsResponse.status).toBe(200);
      expect(user1ConversationsResponse.body).toHaveLength(1);
      expect(user1ConversationsResponse.body[0].participant.id).toBe(user2Id);
      expect(user1ConversationsResponse.body[0].unreadCount).toBe(1);

      // 6. Get updated messages
      const updatedMessagesResponse = await request(app)
        .get(`/api/direct-messages/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(updatedMessagesResponse.status).toBe(200);
      expect(updatedMessagesResponse.body.messages).toHaveLength(2);
    });

    test('should handle real-time direct messaging with sockets', (done) => {
      const port = server.address().port;
      
      // Connect both users via socket
      clientSocket1 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user1Token }
      });

      clientSocket2 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user2Token }
      });

      let messagesReceived = 0;

      clientSocket2.on('direct_message_received', (message: any) => {
        expect(message.content).toBe('Real-time message');
        expect(message.senderId).toBe(user1Id);
        messagesReceived++;
        
        if (messagesReceived === 1) {
          done();
        }
      });

      clientSocket1.on('connect', () => {
        // Send direct message via socket
        clientSocket1.emit('direct_message_sent', {
          receiverId: user2Id,
          content: 'Real-time message'
        });
      });
    });

    test('should prevent unauthorized access to conversations', async () => {
      // Create a third user
      const user3Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'test3@example.com',
          password: 'password123'
        });

      const user3Token = user3Response.body.token;
      const user3Id = user3Response.body.user.id;

      // Send message between user1 and user2
      await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'Private message'
        });

      // User3 should not be able to access the conversation
      const unauthorizedResponse = await request(app)
        .get(`/api/direct-messages/${user1Id}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(unauthorizedResponse.status).toBe(200);
      expect(unauthorizedResponse.body.messages).toHaveLength(0);
    });
  });
});