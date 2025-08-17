import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { initializeSocket } from '../socket';
import { AuthUtils } from '../utils/auth';

// Mock dependencies
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userRoom: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    room: {
      update: jest.fn(),
    },
  },
  redis: {
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

jest.mock('../utils/redis', () => ({
  UserPresenceManager: {
    addUserToRoom: jest.fn(),
    removeUserFromRoom: jest.fn(),
    setUserOnline: jest.fn(),
    setUserOffline: jest.fn(),
    getRoomsForUser: jest.fn().mockResolvedValue([]),
    removeUserFromAllRooms: jest.fn(),
  },
  TypingManager: {
    setUserTyping: jest.fn(),
    removeUserTyping: jest.fn(),
  },
}));

const mockPrisma = require('../config/database').prisma;

describe('Socket.io Server', () => {
  let io: SocketIOServer;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    status: 'ONLINE',
  };

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer);
    initializeSocket(io);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      // Mock successful authentication
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      
      const token = AuthUtils.generateToken({
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      });

      clientSocket = Client(`http://localhost:${port}`, {
        auth: { token },
      });

      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate user on connection', () => {
      expect(serverSocket.data.userId).toBe(mockUser.id);
      expect(serverSocket.data.username).toBe(mockUser.username);
    });

    it('should update user status to online', () => {
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          status: 'ONLINE',
          lastSeen: expect.any(Date),
        },
      });
    });
  });

  describe('Room Management', () => {
    it('should handle join room event', (done) => {
      const roomId = 'room-1';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
        room: { id: roomId, name: 'Test Room' },
      });

      clientSocket.emit('join_room', roomId);

      // Listen for user_joined event
      clientSocket.on('user_joined', (data: any) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.username).toBe(mockUser.username);
        expect(data.roomId).toBe(roomId);
        done();
      });
    });

    it('should handle leave room event', (done) => {
      const roomId = 'room-1';
      
      clientSocket.emit('leave_room', roomId);

      // Listen for user_left event
      clientSocket.on('user_left', (data: any) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.username).toBe(mockUser.username);
        expect(data.roomId).toBe(roomId);
        done();
      });
    });

    it('should handle access denied to room', (done) => {
      const roomId = 'private-room';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue(null); // No access

      clientSocket.emit('join_room', roomId);

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Access denied to room');
        expect(error.code).toBe('ROOM_ACCESS_DENIED');
        done();
      });
    });
  });

  describe('Messaging', () => {
    it('should handle send message event', (done) => {
      const messageData = {
        content: 'Hello world!',
        roomId: 'room-1',
      };

      const mockMessage = {
        id: 'msg-1',
        content: messageData.content,
        userId: mockUser.id,
        roomId: messageData.roomId,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
        user: {
          id: mockUser.id,
          username: mockUser.username,
        },
      };

      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: messageData.roomId,
      });
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.room.update.mockResolvedValue({});

      clientSocket.emit('send_message', messageData);

      clientSocket.on('message_received', (message: any) => {
        expect(message.content).toBe(messageData.content);
        expect(message.user.username).toBe(mockUser.username);
        done();
      });
    });

    it('should reject empty messages', (done) => {
      const messageData = {
        content: '',
        roomId: 'room-1',
      };

      clientSocket.emit('send_message', messageData);

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Message content cannot be empty');
        expect(error.code).toBe('EMPTY_MESSAGE');
        done();
      });
    });

    it('should reject messages that are too long', (done) => {
      const messageData = {
        content: 'a'.repeat(1001), // Over 1000 character limit
        roomId: 'room-1',
      };

      clientSocket.emit('send_message', messageData);

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Message too long (max 1000 characters)');
        expect(error.code).toBe('MESSAGE_TOO_LONG');
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should handle typing start event', (done) => {
      const roomId = 'room-1';
      
      mockPrisma.userRoom.findUnique.mockResolvedValue({
        userId: mockUser.id,
        roomId: roomId,
      });

      clientSocket.emit('typing_start', roomId);

      clientSocket.on('typing_indicator', (data: any) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.username).toBe(mockUser.username);
        expect(data.roomId).toBe(roomId);
        expect(data.isTyping).toBe(true);
        done();
      });
    });

    it('should handle typing stop event', (done) => {
      const roomId = 'room-1';

      clientSocket.emit('typing_stop', roomId);

      clientSocket.on('typing_indicator', (data: any) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.username).toBe(mockUser.username);
        expect(data.roomId).toBe(roomId);
        expect(data.isTyping).toBe(false);
        done();
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle ping/pong for heartbeat', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', () => {
        done();
      });
    });

    it('should handle disconnect event', () => {
      // This is tested implicitly when the socket disconnects
      expect(serverSocket.data.userId).toBe(mockUser.id);
    });
  });
});