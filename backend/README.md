# News Chat Backend

A simple Node.js backend for a news chatbot using AI and semantic search.

## What it does

- **Chat with AI** about news using Google Gemini
- **Search news** using Pinecone vector database  
- **Manage sessions** with Redis (active) and PostgreSQL (saved)
- **Simple API** for frontend integration

## Tech Stack

- **Node.js + TypeScript** - Server and type safety
- **Express.js** - Web framework
- **PostgreSQL (Neon)** - Database for saved conversations
- **Redis Cloud** - Cache for active sessions
- **Pinecone** - Vector search for news content
- **Google Gemini** - AI chat responses

## How it works

1. **Create Session** - Start a new chat (stored in Redis)
2. **Send Message** - User asks about news
3. **Search News** - Pinecone finds relevant articles  
4. **AI Response** - Gemini generates answer with news context
5. **Reset Chat** - Save conversation to database, clear Redis

## API Endpoints

```
POST   /api/sessions              # Create new session
GET    /api/sessions?sessionIds=  # Get user's saved sessions  
DELETE /api/sessions/:id          # Reset session (save to DB)

POST   /api/chat                  # Send message, get AI response
GET    /api/chat/history/:id      # Get conversation history

GET    /api/health/live           # Health check
```

## Environment Variables

```env
# Database (Neon PostgreSQL)
PGHOST=your-neon-host
PGDATABASE=verge
PGUSER=neondb_owner
PGPASSWORD=your-password
PGSSLMODE=require
PGCHANNELBINDING=require

# Redis Cloud
REDIS_HOST=your-redis-host
REDIS_PORT=18300
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password

# AI Services
GEMINI_API_KEY=your-gemini-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENV=us-east-1
INDEX_NAME=news-embeddings
NAMESPACE=news

# App Config
NODE_ENV=development
CORS_ORIGIN=http://localhost:5174
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see above)
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

## Testing

```bash
# Health check
curl http://localhost:3000/api/health/live

# Create session
curl -X POST http://localhost:3000/api/sessions

# Send message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your-session-id", "message": "What is the latest news?"}'
```

## Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
