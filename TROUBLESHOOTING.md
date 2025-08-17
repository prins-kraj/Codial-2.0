# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot find module 'react'" or similar module errors

**Cause**: Dependencies are not installed or corrupted.

**Solution**:
```bash
# Windows
install-deps.bat

# Linux/Mac
chmod +x install-deps.sh
./install-deps.sh

# Or manually:
npm install
cd server && npm install
cd ../client && npm install
```

### 2. TypeScript errors in tests

**Cause**: Test configuration issues or missing types.

**Solution**: The project now uses Vitest instead of Jest. Make sure you have the latest configuration:
- `vitest.config.ts` is properly configured
- `tsconfig.json` includes Vitest types
- Test files use `vi` instead of `jest` for mocking

### 3. Database connection errors

**Cause**: PostgreSQL or Redis not running.

**Solution**:
```bash
# Start Docker containers
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs if there are issues
docker-compose logs
```

### 4. Port already in use errors

**Cause**: Ports 3000, 3001, 5432, or 6379 are already in use.

**Solution**:
```bash
# Windows - Kill processes on specific ports
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac - Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
```

### 5. Prisma/Database errors

**Cause**: Database schema not migrated or generated.

**Solution**:
```bash
cd server

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Reset database if needed
npm run db:reset
```

### 6. Socket.io connection errors

**Cause**: CORS issues or authentication problems.

**Solution**:
- Check that the API server is running on port 3001
- Verify CORS_ORIGIN in server/.env matches your client URL
- Ensure JWT token is properly stored in localStorage

### 7. Build errors

**Cause**: TypeScript compilation errors or missing dependencies.

**Solution**:
```bash
# Client build
cd client
npm run build

# Server build
cd server
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### 8. Test failures

**Cause**: Test configuration or mock issues.

**Solution**:
```bash
# Run tests
cd client
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Environment Setup

### Required Software
- Node.js 18+ 
- npm 9+
- Docker & Docker Compose
- Git

### Environment Variables

**Server (.env)**:
```env
DATABASE_URL="postgresql://chatuser:chatpass@localhost:5432/chatdb"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

**Client (.env)**:
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Development Workflow

1. **Start Docker services**:
   ```bash
   docker-compose up -d
   ```

2. **Set up database**:
   ```bash
   cd server
   npm run db:migrate
   npm run db:seed
   ```

3. **Start development servers**:
   ```bash
   # From root directory
   npm run dev
   
   # Or separately
   cd server && npm run dev
   cd client && npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432
   - Redis: localhost:6379

## Getting Help

If you're still experiencing issues:

1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure Docker containers are running
4. Check that all ports are available
5. Review the logs for specific error details

For additional help, check the README.md file or create an issue with:
- Error message
- Steps to reproduce
- Your environment details (OS, Node version, etc.)