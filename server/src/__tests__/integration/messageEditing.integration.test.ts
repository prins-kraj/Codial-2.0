import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Client } from 'socket.io-client';
import app from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Message Editing and Deletion Integration Tests', () => {
  let server: any;
  let io: Server;
  let clientSocket1: any;
  let clientSocket2: any;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let roomId: string;

  beforeAll(async () => {
    // Create HTTP server
    const httpServer = createServer(app);
    server = httpServer.listen(0);
    
    // Initialize Socket.IO
    io = new Server(server, {
      cors: { origin: "*" }
    });

    // Clean up database
    await prisma.message.deleteMany();
    await prisma.directMessage.deleteMany();
    await prisma.room.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.directMessage.deleteMany();
    await prisma.room.deleteMany();
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
        username: 'edituser1',
        email: 'edit1@example.com',
        password: 'password123'
      });

    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'edituser2',
        email: 'edit2@example.com',
        password: 'password123'
      });

    user1Token = user1Response.body.token;
    user2Token = user2Response.body.token;
    user1Id = user1Response.body.user.id;
    user2Id = user2Response.body.user.id;

    // Create a test room
    const roomResponse = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Test Room',
        description: 'Room for testing message editing'
      });

    roomId = roomResponse.body.id;

    // Join user2 to the room
    await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${user2Token}`);
  });

  afterEach(async () => {
    await prisma.message.deleteMany();
    await prisma.directMessage.deleteMany();
    await prisma.room.deleteMany();
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

  describe('Room Message Editing and Deletion', () => {
    test('should handle complete message editing workflow in rooms', async () => {
      // 1. Send initial message
      const messageResponse = await request(app)
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Original message content'
        });

      expect(messageResponse.status).toBe(201);
      const messageId = messageResponse.body.id;
      expect(messageResponse.body.content).toBe('Original message content');
      expect(messageResponse.body.editedAt).toBeNull();

      // 2. Edit the message
      const editResponse = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Edited message content'
        });

      expect(editResponse.status).toBe(200);
      expect(editResponse.body.content).toBe('Edited message content');
      expect(editResponse.body.editedAt).toBeDefined();
      expect(editResponse.body.editHistory).toBeDefined();

      // 3. Verify message was updated in room
      const roomMessagesResponse = await request(app)
        .get(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(roomMessagesResponse.status).toBe(200);
      const editedMessage = roomMessagesResponse.body.find((msg: any) => msg.id === messageId);
      expect(editedMessage.content).toBe('Edited message content');
      expect(editedMessage.editedAt).toBeDefined();

      // 4. Edit the message again to test edit history
      const secondEditResponse = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Second edit of message'
        });

      expect(secondEditResponse.status).toBe(200);
      expect(secondEditResponse.body.content).toBe('Second edit of message');
      expect(secondEditResponse.body.editHistory).toHaveLength(2);

      // 5. Try to edit message as different user (should fail)
      const unauthorizedEditResponse = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Unauthorized edit attempt'
        });

      expect(unauthorizedEditResponse.status).toBe(403);
    });

    test('should handle message deletion workflow in rooms', async () => {
      // 1. Send message to delete
      const messageResponse = await request(app)
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Message to be deleted'
        });

      const messageId = messageResponse.body.id;

      // 2. Delete the message
      const deleteResponse = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Message deleted successfully');

      // 3. Verify message is marked as deleted
      const roomMessagesResponse = await request(app)
        .get(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(roomMessagesResponse.status).toBe(200);
      const deletedMessage = roomMessagesResponse.body.find((msg: any) => msg.id === messageId);
      expect(deletedMessage.isDeleted).toBe(true);
      expect(deletedMessage.content).toBe('[Message deleted]');

      // 4. Try to delete message as different user (should fail)
      const anotherMessageResponse = await request(app)
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Another message'
        });

      const anotherMessageId = anotherMessageResponse.body.id;

      const unauthorizedDeleteResponse = await request(app)
        .delete(`/api/messages/${anotherMessageId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unauthorizedDeleteResponse.status).toBe(403);
    });

    test('should handle real-time message editing with sockets', (done) => {
      const port = server.address().port;
      
      // Connect both users via socket
      clientSocket1 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user1Token }
      });

      clientSocket2 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user2Token }
      });

      let eventsReceived = 0;

      // User2 listens for message edit events
      clientSocket2.on('message_edited', (data: any) => {
        expect(data.content).toBe('Edited via socket');
        expect(data.editedAt).toBeDefined();
        eventsReceived++;
        
        if (eventsReceived === 1) {
          done();
        }
      });

      clientSocket1.on('connect', async () => {
        // Send a message first
        const messageResponse = await request(app)
          .post(`/api/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Original socket message'
          });

        const messageId = messageResponse.body.id;

        // Edit message via socket
        clientSocket1.emit('message_edit_request', {
          messageId,
          content: 'Edited via socket'
        });
      });
    });
  });

  describe('Direct Message Editing and Deletion', () => {
    test('should handle direct message editing workflow', async () => {
      // 1. Send direct message
      const dmResponse = await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'Original DM content'
        });

      expect(dmResponse.status).toBe(201);
      const dmId = dmResponse.body.id;

      // 2. Edit the direct message
      const editResponse = await request(app)
        .put(`/api/direct-messages/${dmId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Edited DM content'
        });

      expect(editResponse.status).toBe(200);
      expect(editResponse.body.content).toBe('Edited DM content');
      expect(editResponse.body.editedAt).toBeDefined();

      // 3. Verify edit in conversation
      const conversationResponse = await request(app)
        .get(`/api/direct-messages/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(conversationResponse.status).toBe(200);
      const editedDM = conversationResponse.body.messages.find((msg: any) => msg.id === dmId);
      expect(editedDM.content).toBe('Edited DM content');
      expect(editedDM.editedAt).toBeDefined();

      // 4. Receiver should also see the edit
      const receiverConversationResponse = await request(app)
        .get(`/api/direct-messages/${user1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(receiverConversationResponse.status).toBe(200);
      const receiverEditedDM = receiverConversationResponse.body.messages.find((msg: any) => msg.id === dmId);
      expect(receiverEditedDM.content).toBe('Edited DM content');
    });

    test('should handle direct message deletion workflow', async () => {
      // 1. Send direct message
      const dmResponse = await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'DM to be deleted'
        });

      const dmId = dmResponse.body.id;

      // 2. Delete the direct message
      const deleteResponse = await request(app)
        .delete(`/api/direct-messages/${dmId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(deleteResponse.status).toBe(200);

      // 3. Verify deletion in conversation
      const conversationResponse = await request(app)
        .get(`/api/direct-messages/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(conversationResponse.status).toBe(200);
      const deletedDM = conversationResponse.body.messages.find((msg: any) => msg.id === dmId);
      expect(deletedDM.isDeleted).toBe(true);
      expect(deletedDM.content).toBe('[Message deleted]');
    });

    test('should prevent unauthorized editing of direct messages', async () => {
      // User1 sends DM to User2
      const dmResponse = await request(app)
        .post('/api/direct-messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'Private message'
        });

      const dmId = dmResponse.body.id;

      // User2 (receiver) should not be able to edit User1's message
      const unauthorizedEditResponse = await request(app)
        .put(`/api/direct-messages/${dmId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Trying to edit someone elses message'
        });

      expect(unauthorizedEditResponse.status).toBe(403);

      // User2 should not be able to delete User1's message
      const unauthorizedDeleteResponse = await request(app)
        .delete(`/api/direct-messages/${dmId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unauthorizedDeleteResponse.status).toBe(403);
    });
  });

  describe('Cross-Client Real-time Updates', () => {
    test('should broadcast message edits across all connected clients', (done) => {
      const port = server.address().port;
      
      clientSocket1 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user1Token }
      });

      clientSocket2 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user2Token }
      });

      let messageId: string;
      let eventsReceived = 0;

      // Both clients listen for edit events
      clientSocket2.on('message_edited', (data: any) => {
        expect(data.id).toBe(messageId);
        expect(data.content).toBe('Edited by user1');
        eventsReceived++;
        
        if (eventsReceived === 1) {
          done();
        }
      });

      clientSocket1.on('connect', async () => {
        // Send message first
        const messageResponse = await request(app)
          .post(`/api/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Message to edit'
          });

        messageId = messageResponse.body.id;

        // Join both clients to the room
        clientSocket1.emit('join_room', roomId);
        clientSocket2.emit('join_room', roomId);

        // Edit the message
        setTimeout(() => {
          clientSocket1.emit('message_edit_request', {
            messageId,
            content: 'Edited by user1'
          });
        }, 100);
      });
    });

    test('should broadcast message deletions across all connected clients', (done) => {
      const port = server.address().port;
      
      clientSocket1 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user1Token }
      });

      clientSocket2 = new (require('socket.io-client'))(`http://localhost:${port}`, {
        auth: { token: user2Token }
      });

      let messageId: string;

      clientSocket2.on('message_deleted', (data: any) => {
        expect(data.id).toBe(messageId);
        expect(data.isDeleted).toBe(true);
        done();
      });

      clientSocket1.on('connect', async () => {
        // Send message first
        const messageResponse = await request(app)
          .post(`/api/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Message to delete'
          });

        messageId = messageResponse.body.id;

        // Join both clients to the room
        clientSocket1.emit('join_room', roomId);
        clientSocket2.emit('join_room', roomId);

        // Delete the message
        setTimeout(() => {
          clientSocket1.emit('message_delete_request', {
            messageId
          });
        }, 100);
      });
    });
  });
});