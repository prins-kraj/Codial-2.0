import { Request, Response, NextFunction } from 'express';
import { sanitizeInput, requestLogger } from '../middleware/security';
import { errorHandler, AppError, NotFoundError } from '../middleware/errorHandler';

describe('Security Middleware', () => {
  describe('sanitizeInput', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        body: {},
        query: {},
        params: {},
      };
      res = {};
      next = jest.fn();
    });

    it('should sanitize script tags from body', () => {
      req.body = {
        message: 'Hello <script>alert("xss")</script> world',
        normal: 'This is normal text',
      };

      sanitizeInput(req as Request, res as Response, next);

      expect(req.body.message).toBe('Hello  world');
      expect(req.body.normal).toBe('This is normal text');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      req.body = {
        user: {
          name: 'Test <script>alert("xss")</script> User',
          bio: 'Normal bio text',
        },
      };

      sanitizeInput(req as Request, res as Response, next);

      expect(req.body.user.name).toBe('Test  User');
      expect(req.body.user.bio).toBe('Normal bio text');
    });

    it('should handle non-string values', () => {
      req.body = {
        number: 123,
        boolean: true,
        null: null,
        array: ['test', 456],
      };

      sanitizeInput(req as Request, res as Response, next);

      expect(req.body.number).toBe(123);
      expect(req.body.boolean).toBe(true);
      expect(req.body.null).toBe(null);
      expect(req.body.array).toEqual(['test', 456]);
    });
  });

  describe('requestLogger', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test User Agent'),
      };
      res = {
        statusCode: 200,
        on: jest.fn(),
      };
      next = jest.fn();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log successful requests', () => {
      const mockOn = res.on as jest.Mock;
      
      requestLogger(req as Request, res as Response, next);
      
      expect(mockOn).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();

      // Simulate response finish
      const finishCallback = mockOn.mock.calls[0][1];
      finishCallback();

      expect(consoleSpy).toHaveBeenCalledWith('Request:', expect.objectContaining({
        method: 'GET',
        url: '/test',
        status: 200,
        ip: '127.0.0.1',
      }));
    });
  });
});

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    req = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
    };
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    res = {
      status: statusSpy,
    };
    next = jest.fn();
  });

  it('should handle AppError correctly', () => {
    const error = new NotFoundError('Resource not found');
    
    errorHandler(error, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith({
      success: false,
      error: 'Resource not found',
    });
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error');
    
    errorHandler(error, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
    });
  });

  it('should handle JWT errors', () => {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    
    errorHandler(error, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid token',
    });
  });

  it('should include stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Test error');
    
    errorHandler(error, req as Request, res as Response, next);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
        stack: expect.any(String),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});