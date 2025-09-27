# Verge News Chat Backend - Setup Guide

## Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: Latest version
- **Database**: Neon DB (PostgreSQL)
- **Vector DB**: Pinecone
- **AI**: Google Gemini API

## 📦 Installation

```bash
# Clone and install dependencies
cd /path/to/verge/backend
npm install
```

## 🔧 Environment Variables

Create a `.env` file in the root directory with variables from env.example:

## 🗄️ Database Setup

The application will automatically connect to your Neon DB. Run the migration to set up the simplified schema:

```bash
# Create the database tables
npm run db:generate
npm run db:migrate
```

**Or manually run the SQL migration:**
```bash
psql postgresql://neondb_owner:your_password@ep-wild-surf-pooler.c-2.us-east-1.aws.neon.tech/verge?sslmode=require -f migrations/001_simplify_schema.sql
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
This will start the server with hot-reload on `http://localhost:3000`

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Other Useful Commands
```bash
# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format

# Database studio (optional)
npm run db:studio
```

## 🔍 Health Check

Once running, check if everything is working:

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-09-26T...",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "pinecone": "connected"
  }
}
```

## 📡 API Endpoints

### Create Session
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Send Message
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id-here",
    "message": "What are the latest AI developments?"
  }'
```

### Get Chat History
```bash
curl http://localhost:3000/api/chat/history/your-session-id-here
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your `PGPASSWORD` is correct
   - Ensure Neon DB instance is active
   - Verify all PG* environment variables

2. **Pinecone Connection Failed**
   - Verify `PINECONE_API_KEY` is correct
   - Check if index `news-embeddings` exists
   - Ensure namespace `news` has data

3. **Gemini API Failed**
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Check API key has proper permissions

4. **Redis Connection Issues**
   - Redis Cloud configuration is hardcoded
   - Should connect automatically to provided instance

### Debug Logs

Set `LOG_LEVEL=debug` in your `.env` to see detailed logs:

```env
LOG_LEVEL=debug
```

## 🏗️ Architecture

```
Frontend → Backend API → Session Management → Pinecone Search → Gemini AI → Response
                     ↓
                Database (Neon) + Redis Cache
```

## 📝 Key Features

- ✅ **Session-based chat** with conversation memory
- ✅ **Pinecone integration** for semantic news search
- ✅ **Gemini multi-turn** conversations
- ✅ **Redis caching** for active sessions
- ✅ **PostgreSQL persistence** for chat history
- ✅ **Rate limiting** and security
- ✅ **Health monitoring**

## 🎯 What You Need To Do

1. **Add your passwords/keys**:
   - `PGPASSWORD` (from Neon DB)
   - `GEMINI_API_KEY` (from Google)

2. **Run the application**:
   ```bash
   npm run dev
   ```

3. **Test the endpoints** using the curl commands above

That's it! The application should be running and ready to handle news chat conversations. 🎉
