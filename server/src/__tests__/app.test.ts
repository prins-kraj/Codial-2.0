import request from 'supertest';
import { app } from '../app';

// Mock database initialization
jest.mock('../config/database', () => ({
  initializeDatabase: jest.fn(),
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  redis: {
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  },
}));

describe('Express App', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Server is healthy',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Real-Time Chat API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          rooms: '/api/rooms',
          messages: '/api/messages',
        },
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Route GET /api/nonexistent not found',
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON requests', async () => {
      const testData = { test: 'data' };
      
      // This will hit the 404 handler but should parse JSON first
      const response = await request(app)
        .post('/api/test')
        .send(testData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});