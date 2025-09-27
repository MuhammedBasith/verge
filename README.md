# Verge

A full-stack news chatbot that leverages Retrieval-Augmented Generation (RAG) to provide intelligent responses about news content. Users can engage in natural conversations about current events, with each session maintaining context and conversation history.

## Architecture

Verge consists of two main components:

- **Frontend**: React-based chat interface with session management
- **Backend**: Node.js API with vector search and AI integration

```
Frontend (React + Vite) ←→ Backend (Node.js + Express)
                                      ↓
                            Vector Search (Pinecone)
                                      ↓
                              AI Chat (Google Gemini)
                                      ↓
                          Database (PostgreSQL + Redis)
```

## Core Features

- **Intelligent Chat**: Context-aware conversations about news topics
- **Session Management**: Persistent chat sessions with conversation memory
- **Semantic Search**: Vector-based news content retrieval
- **Real-time Interface**: Responsive chat UI with typing indicators
- **Session History**: Browse and resume previous conversations

## Technology Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI components
- Axios for API communication

### Backend
- Node.js 18+ with TypeScript
- Express.js framework
- PostgreSQL (Neon) with Drizzle ORM
- Redis for session caching
- Pinecone for vector search
- Google Gemini for AI responses

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- PostgreSQL database (Neon recommended)
- Google Gemini API key
- Pinecone account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MuhammedBasith/verge.git
   cd verge
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run db:migrate
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Configure API endpoint
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Project Structure

```
verge/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── lib/           # Shared libraries
│   └── README.md      # Frontend documentation
├── backend/           # Node.js API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database schemas
│   │   ├── routes/        # API routes
│   │   └── config/        # Configuration
│   ├── README.md      # Backend documentation
│   └── SETUP_GUIDE.md # Detailed setup instructions
└── README.md          # This file
```

## API Overview

### Core Endpoints
- `POST /api/sessions` - Create new chat session
- `POST /api/chat` - Send message and get AI response
- `GET /api/chat/history/:sessionId` - Retrieve conversation history
- `GET /api/sessions` - List user sessions
- `GET /api/health` - System health check

## Configuration

### Environment Variables

Both frontend and backend require environment configuration:

- **Backend**: Database credentials, API keys, Redis configuration
- **Frontend**: API endpoint configuration

See individual README files in each directory for detailed configuration options.

## Development

### Running in Development Mode

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Code Quality

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
```

## Documentation

- [Frontend Documentation](./frontend/README.md) - React app setup and architecture
- [Backend Documentation](./backend/README.md) - API architecture and services
- [Setup Guide](./backend/SETUP_GUIDE.md) - Detailed installation instructions
- [API Documentation](./backend/API_DOCUMENTATION.md) - Complete API reference

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
