import request from 'supertest';
import { app } from '../app';
import { AuthUtils } from '../utils/auth';

// Mock database
jest.mock('../config/database', () => ({
  prisma: {
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userRoom: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
  },
  redis: {
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

const mockPrisma = require('../config/database').prisma;

describe('Room Controller', () => {
  let authToken: string;
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Generate auth token for tests
    authToken = AuthUtils.generateToken({
      userId: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
    });
    jest.clearAllMocks();
  });

  describe('GET /api/rooms', () => {
    it('should return list of rooms', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'General',
          description: 'General chat',
          isPrivate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'user-1', username: 'testuser' },
          userRooms: [{ user: { id: 'user-1', username: 'testuser', status: 'ONLINE' } }],
          _count: { messages: 10, userRooms: 1 },
        },
      ];

      mockPrisma.room.findMany.mockResolvedValue(mockRooms);

      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('General');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/rooms')
        .expect(401);
    });
  });

  describe('POST /api/rooms', () => {
    it('should create a new room', async () => {
      const newRoom = {
        name: 'Test Room',
        description: 'A test room',
        isPrivate: false,
      };

      const mockCreatedRoom = {
        id: 'room-2',
        ...newRoom,
        createdBy: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: mockUser.id, username: mockUser.username },
      };

      mockPrisma.room.findFirst.mockResolvedValue(null); // No existing room
      mockPrisma.room.create.mockResolvedValue(mockCreatedRoom);
      mockPrisma.userRoom.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoom)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Room');
      expect(response.body.message).toBe('Room created successfully');
    });

    it('should validate room name', async () => {
      const invalidRoom = {
        name: '', // Empty name
        description: 'A test room',
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoom)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate room names', async () => {
      const newRoom = {
        name: 'Existing Room',
        description: 'A test room',
      };

      mockPrisma.room.findFirst.mockResolvedValue({ id: 'existing-room' });

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoom)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Room with this name already exists');
    });
  });

  describe('POST /api/rooms/:roomId/join', () => {
    it('should join user to room', async () => {
      const roomId = 'room-1';
      
      mockPrisma.room.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Test Room',
        userRooms: [], // User not in room
      });
      mockPrisma.userRoom.create.mockResolvedValue({});

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully joined room');
    });

    it('should handle already joined room', async () => {
      const roomId = 'room-1';
      
      mockPrisma.room.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Test Room',
        userRooms: [{ userId: mockUser.id }], // User already in room
      });

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Already joined to room');
    });

    it('should handle non-existent room', async () => {
      const roomId = 'non-existent';
      
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Room not found');
    });
  });

  describe('POST /api/rooms/:roomId/leave', () => {
    it('should leave room successfully', async () => {
      const roomId = 'room-1';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
        room: {
          id: roomId,
          createdBy: 'other-user', // Not the creator
        },
      });
      mockPrisma.userRoom.delete.mockResolvedValue({});

      const response = await request(app)
        .post(`/api/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully left room');
    });

    it('should prevent creator from leaving with other members', async () => {
      const roomId = 'room-1';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
        room: {
          id: roomId,
          createdBy: mockUser.id, // User is the creator
        },
      });
      mockPrisma.userRoom.count.mockResolvedValue(2); // Other members present

      const response = await request(app)
        .post(`/api/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Room creator cannot leave while other members are present');
    });
  });

  describe('GET /api/rooms/:roomId/messages', () => {
    it('should return room messages', async () => {
      const roomId = 'room-1';
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello world',
          createdAt: new Date(),
          user: { id: 'user-1', username: 'testuser' },
        },
      ];

      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
        room: { isPrivate: false },
      });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.userRoom.update.mockResolvedValue({});

      const response = await request(app)
        .get(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.messages[0].content).toBe('Hello world');
    });

    it('should handle pagination', async () => {
      const roomId = 'room-1';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
        room: { isPrivate: false },
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.userRoom.update.mockResolvedValue({});

      const response = await request(app)
        .get(`/api/rooms/${roomId}/messages?page=2&limit=25`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(25);
    });
  });
});