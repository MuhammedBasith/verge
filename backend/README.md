# Verge Chat Backend

A simplified, production-ready Node.js backend for a news chatbot with semantic search and session management.

## 🚀 Features

### Core Functionality
- **Session-Based Chat**: Persistent chat sessions with conversation memory
- **Semantic Search**: Pinecone integration with built-in embeddings
- **Multi-Turn Conversations**: Gemini 2.5 Flash with conversation history
- **News Context**: Real-time news context from Pinecone vector database
- **Simple Architecture**: Clean, maintainable codebase

### Technical Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Cache**: Redis Cloud for session management
- **Vector Search**: Pinecone with integrated embeddings
- **AI**: Google Gemini 2.5 Flash for multi-turn conversations
- **Validation**: Zod schemas for all API endpoints
- **Logging**: Winston with structured logging
- **Security**: Helmet, CORS, rate limiting, input validation

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- Neon Database (PostgreSQL)
- Google Gemini API key
- Pinecone account (API key provided)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   
   Create a `.env` file in the root directory:
   ```env
   # Required - Neon Database
   PGHOST=ep-wild-surf-pooler.c-2.us-east-1.aws.neon.tech
   PGDATABASE=verge
   PGUSER=neondb_owner
   PGPASSWORD=your_neon_password_here
   PGSSLMODE=require
   PGCHANNELBINDING=require
   
   # Required - AI Services
   GEMINI_API_KEY=your_gemini_api_key_here
   PINECONE_API_KEY=pcsk_7UJ1akweBmyJyS27
   PINECONE_ENV=us-east-1
   INDEX_NAME=news-embeddings
   NAMESPACE=news
   
   # Optional - Application
   NODE_ENV=development
   PORT=3000
   ```
   
   📋 **See `SETUP_GUIDE.md` for complete environment variable list**

4. **Database setup**
   ```bash
   # Run the simplified schema migration
   npm run db:migrate
   
   # Or manually with psql:
   # psql postgresql://neondb_owner:password@ep-wild-surf-pooler.c-2.us-east-1.aws.neon.tech/verge?sslmode=require -f migrations/001_simplify_schema.sql
   ```

## 🏃‍♂️ Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Core Chat API
- `POST /api/sessions` - Create a new chat session
- `POST /api/chat` - Send message and get AI response with news context
- `GET /api/chat/history/:sessionId` - Get chat history for a session

### Session Management  
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:sessionId/messages` - Get session messages
- `PATCH /api/sessions/:sessionId` - Update session title
- `DELETE /api/sessions/:sessionId` - Delete a session

### Health & Monitoring
- `GET /api/health` - System health check

## 🧪 Quick Test

Once running, test the API:

```bash
# 1. Create a session
curl -X POST http://localhost:3000/api/sessions

# 2. Send a message (replace SESSION_ID)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "message": "What are the latest developments in AI?"
  }'

# 3. Check health
curl http://localhost:3000/api/health
```

## 🏗️ Architecture

### Simple Flow
```
Frontend → API → Session Management → Pinecone Search → Gemini AI → Response
                        ↓
                Database (Neon) + Redis Cache
```

### Key Components
- **Session Service**: Manages chat sessions and conversation history
- **Pinecone Service**: Semantic search with integrated embeddings  
- **Gemini Service**: Multi-turn conversations with context
- **News Chat Service**: Orchestrates Pinecone + Gemini integration

## 🔧 Development

### Useful Commands
```bash
# Development with hot reload
npm run dev

# Code quality
npm run lint
npm run format

# Database operations
npm run db:migrate
npm run db:studio
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your `PGPASSWORD` is correct
   - Ensure all Neon DB environment variables are set

2. **Gemini API Failed** 
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Verify `GEMINI_API_KEY` in your `.env`

3. **Pinecone Connection Failed**
   - Verify `PINECONE_API_KEY` is correct
   - Check if your Pinecone index has data

### Debug Mode
Set `LOG_LEVEL=debug` in your `.env` for detailed logs.

## 📚 Documentation

- `SETUP_GUIDE.md` - Complete setup instructions
- `SIMPLIFIED_API.md` - API documentation  
- `PINECONE_INTEGRATION.md` - Pinecone setup details
- `GEMINI_MULTI_TURN.md` - Gemini conversation setup
- `NEON_DB_SETUP.md` - Database configuration

## 📄 License

MIT License
