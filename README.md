# Real-Time Chat Website

A modern real-time chatting website built with React, Node.js, Socket.io, and PostgreSQL.

## Features

- 🔐 User authentication and registration
- 💬 Real-time messaging with Socket.io
- 🏠 Multiple chat rooms/channels
- 👥 User presence and status indicators
- 📱 Responsive design for mobile and desktop
- 🔒 Security features and message moderation
- 📝 Message history and persistence

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.io client for real-time communication
- Zustand for state management
- React Hook Form for form handling

### Backend
- Node.js with Express.js
- Socket.io for WebSocket server
- PostgreSQL with Prisma ORM
- Redis for session management
- JWT for authentication

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd real-time-chat-website
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

4. Start the development environment with Docker:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
cd server && npx prisma migrate dev
```

6. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Development

### Project Structure
```
├── client/          # React frontend application
├── server/          # Node.js backend application
├── docker-compose.yml
└── package.json     # Root package.json for workspace
```

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications

## Deployment

The application is containerized and ready for deployment. See the deployment documentation for specific platform instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.