# Verge Backend

A production-ready Node.js backend for the Verge news chatbot, implementing RAG (Retrieval-Augmented Generation) with semantic search and intelligent session management.

## Architecture Overview

The backend follows a clean, layered architecture designed for scalability and maintainability:

```
API Layer (Express.js)
    ↓
Service Layer (Business Logic)
    ↓
Data Layer (PostgreSQL + Redis + Pinecone)
    ↓
External APIs (Google Gemini)
```

## Technology Stack

### Core Framework
- **Node.js 18+** with **TypeScript** - Type-safe server-side development
- **Express.js 5.1.0** - Web framework with modern middleware
- **Zod 4.1.11** - Runtime type validation and schema definition

### Database & Caching
- **PostgreSQL** via **Neon Cloud** - Primary data storage
- **Drizzle ORM 0.44.5** - Type-safe database queries
- **Redis (ioredis 5.8.0)** - Session caching and performance optimization
- **Connection Pooling** - Optimized database connections

### AI & Vector Search
- **Google Gemini 2.5 Flash** - Advanced conversational AI
- **Pinecone 6.1.2** - Vector database for semantic search
- **Integrated Embeddings** - Built-in text vectorization

### Security & Monitoring
- **Helmet 8.1.0** - Security headers and protection
- **CORS 2.8.5** - Cross-origin resource sharing
- **Express Rate Limit 8.1.0** - API rate limiting
- **Winston 3.17.0** - Structured logging with multiple transports
- **Morgan 1.10.1** - HTTP request logging

### Development Tools
- **TypeScript 5.9.2** - Static type checking
- **ESLint + Prettier** - Code quality and formatting
- **Nodemon 3.1.10** - Development hot reload
- **Drizzle Kit** - Database migrations and studio

## Core Services

### Session Service
Manages chat sessions with intelligent caching strategies:

```typescript
class SessionService {
  private readonly sessionTTL = 86400; // 24 hours
  private readonly maxMessages = 100;
  
  // Redis-first approach for active sessions
  // PostgreSQL for persistence and history
}
```

**Key Features:**
- **Hybrid Storage**: Redis for active sessions, PostgreSQL for persistence
- **Automatic Cleanup**: TTL-based session expiration
- **Message Limiting**: Prevents memory bloat with configurable limits
- **Transaction Safety**: ACID compliance for critical operations

### Pinecone Service
Semantic search with integrated embeddings:

```typescript
class PineconeService {
  async searchSimilarContent(query: string): Promise<SearchResult[]> {
    // Uses Pinecone's integrated embedding model
    // No external embedding API calls required
  }
}
```

**Search Strategy:**
- **Integrated Embeddings**: No external embedding service needed
- **Namespace Isolation**: Organized content separation
- **Relevance Scoring**: Configurable similarity thresholds
- **Error Resilience**: Graceful degradation on search failures

### Gemini Service
Multi-turn conversations with context awareness:

```typescript
class GeminiService {
  async generateResponse(
    messages: Message[], 
    context: string
  ): Promise<string> {
    // Maintains conversation history
    // Incorporates news context from Pinecone
  }
}
```

**Conversation Features:**
- **Context Injection**: News content seamlessly integrated
- **History Awareness**: Multi-turn conversation memory
- **Safety Filters**: Built-in content moderation
- **Streaming Support**: Real-time response generation

## Caching Strategy & TTL Configuration

### Redis TTL Management

The backend implements sophisticated TTL (Time-To-Live) strategies for optimal performance:

```typescript
// Configuration in src/schemas/index.ts
export const envSchema = z.object({
  REDIS_TTL: z.coerce.number().default(3600),        // 1 hour default
  SESSION_TTL: z.coerce.number().default(86400),     // 24 hours
  // ... other configurations
});
```

### TTL Strategies by Data Type

#### Session Data
```typescript
// Active session: 24 hours (configurable)
await cache.setSessionData(sessionId, sessionData, SESSION_TTL);

// Chat history: Same as session TTL
await cache.setChatHistory(sessionId, messages, SESSION_TTL);
```

#### Search Results
```typescript
// Pinecone results: 1 hour (frequently changing news)
await cache.set(`search:${queryHash}`, results, 3600);
```

#### Health Check Data
```typescript
// System health: 5 minutes (frequent monitoring)
await cache.set('health:status', healthData, 300);
```

### TTL Trade-offs & Decisions

**Session TTL (24 hours)**
- **Pros**: Maintains user context across long periods
- **Cons**: Higher memory usage
- **Decision**: Balanced for user experience vs resource usage

**Search Cache TTL (1 hour)**
- **Pros**: Fresh news content, reduced API calls
- **Cons**: Some repeated searches
- **Decision**: Optimized for news freshness

**Health Check TTL (5 minutes)**
- **Pros**: Quick issue detection
- **Cons**: Frequent cache updates
- **Decision**: Critical for system monitoring

### Cache Invalidation Strategies

```typescript
// Explicit invalidation on session updates
async updateSession(sessionId: string, updates: Partial<Session>) {
  await this.invalidateSessionCache(sessionId);
  // Update database
  // Refresh cache with new data
}

// TTL-based expiration for search results
// Manual invalidation for critical system changes
```

## Database Design

### Schema Architecture
```sql
-- Sessions table (PostgreSQL)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  title VARCHAR(255)
);

-- Messages table with foreign key relationship
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  content TEXT NOT NULL,
  sender VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Migration Strategy
- **Drizzle Migrations**: Version-controlled schema changes
- **Rollback Support**: Safe deployment practices
- **Data Integrity**: Foreign key constraints and validation

## API Design

### RESTful Endpoints
```typescript
// Session Management
POST   /api/sessions              // Create new session
GET    /api/sessions              // List user sessions
GET    /api/sessions/:id/messages // Get session messages
PATCH  /api/sessions/:id          // Update session
DELETE /api/sessions/:id          // Delete session

// Chat Interface
POST   /api/chat                  // Send message, get AI response
GET    /api/chat/history/:id      // Get conversation history

// System Monitoring
GET    /api/health                // Health check endpoint
```

### Request/Response Validation
```typescript
// Zod schemas for all endpoints
export const chatMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

// Automatic validation middleware
app.use('/api/chat', validateSchema(chatMessageSchema));
```

## Performance Optimizations

### Database Optimizations
- **Connection Pooling**: Maximum 20 concurrent connections
- **Query Optimization**: Indexed foreign keys and timestamps
- **Transaction Management**: Minimal transaction scope

### Caching Layers
- **L1 Cache**: In-memory application cache
- **L2 Cache**: Redis distributed cache
- **L3 Cache**: Database query result caching

### API Optimizations
- **Compression**: Gzip middleware for response compression
- **Rate Limiting**: 100 requests per 15-minute window
- **Request Timeout**: 30-second timeout for external APIs

## Security Implementation

### Input Validation
```typescript
// Comprehensive input sanitization
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// SQL injection prevention via Drizzle ORM
// XSS protection through input validation
```

### API Security
- **CORS Configuration**: Restricted to frontend domain
- **Helmet Security Headers**: XSS, CSRF, and clickjacking protection
- **Rate Limiting**: Per-IP request throttling
- **Input Sanitization**: All user inputs validated and sanitized

## Monitoring & Logging

### Structured Logging
```typescript
// Winston configuration with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console()
  ]
});
```

### Health Monitoring
```typescript
// Comprehensive health checks
GET /api/health
{
  "status": "healthy",
  "timestamp": "2025-09-27T...",
  "services": {
    "database": "connected",
    "redis": "connected",
    "pinecone": "connected"
  },
  "performance": {
    "uptime": "2h 15m",
    "memory": "145MB",
    "cpu": "12%"
  }
}
```

## Environment Configuration

### Required Environment Variables
```env
# Database (Neon PostgreSQL)
PGHOST=your-neon-host
PGDATABASE=verge
PGUSER=neondb_owner
PGPASSWORD=your-password
PGSSLMODE=require

# AI Services
GEMINI_API_KEY=your-gemini-key
PINECONE_API_KEY=your-pinecone-key

# Redis (Optional - uses default if not provided)
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600
SESSION_TTL=86400
```

**📋 Complete setup instructions available in [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Code Quality
```bash
# Linting and formatting
npm run lint
npm run lint:fix
npm run format

# Type checking
npm run build
```

### Database Management
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Database studio (GUI)
npm run db:studio
```

## Testing Strategy

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Create session
curl -X POST http://localhost:3000/api/sessions

# Send message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "message": "Hello"}'
```

### Load Testing Considerations
- **Connection Limits**: Database pool sizing
- **Rate Limiting**: API throttling thresholds
- **Memory Management**: Session cleanup strategies
- **Cache Performance**: Redis memory optimization

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis connection established
- [ ] API keys validated
- [ ] Health checks passing
- [ ] Logging configured
- [ ] Security headers enabled

### Scaling Considerations
- **Horizontal Scaling**: Stateless service design
- **Database Scaling**: Read replicas for query optimization
- **Cache Scaling**: Redis clustering for high availability
- **Load Balancing**: Multiple instance deployment

## Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete installation and configuration
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Detailed API reference
- **Migration Files** - Database schema evolution
- **Environment Examples** - Configuration templates

## Contributing

### Code Standards
- **TypeScript Strict Mode**: Full type safety
- **ESLint Configuration**: Enforced code style
- **Conventional Commits**: Structured commit messages
- **Pull Request Reviews**: Mandatory code review process

### Development Guidelines
1. Write comprehensive TypeScript types
2. Add proper error handling and logging
3. Include input validation for all endpoints
4. Update documentation for API changes
5. Test thoroughly with different scenarios

## License

MIT License - See LICENSE file for details
