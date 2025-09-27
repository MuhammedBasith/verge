# 📚 News Chat API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
No authentication required - sessions are managed via sessionId.

---

## 📋 **API Endpoints**

### **1. Create Session**
Creates a new chat session stored in Redis with 24-hour TTL.

**Endpoint:** `POST /api/sessions`

**Request:**
```json
{}
```

**Response:** `201 Created`
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2025-09-26T10:30:00.000Z"
}
```

**Storage:** Redis only (no database write)

**Rate Limit:** 5 requests per minute per IP

---

### **2. Send Chat Message**
Send a message and get AI response with news context from Pinecone + Gemini.

**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "What's the latest news about AI?"
}
```

**Response:** `200 OK`
```json
{
  "message": "Based on recent news, AI developments include...",
  "messageId": "msg-456e7890-f12b-34c5-d678-901234567890",
  "timestamp": "2025-09-26T10:31:15.000Z"
}
```

**Process Flow:**
1. Validate session exists in Redis
2. Store user message in Redis
3. Search Pinecone for relevant news context
4. Generate response using Gemini with conversation history
5. Store assistant message in Redis
6. Generate session title (if first message)

**Storage:** Redis only (no database write)

**Rate Limit:** 20 requests per minute per IP

**Edge Cases:**

| Case | Status | Response |
|------|--------|----------|
| Session not found | `404 Not Found` | `{"error": "Session not found"}` |
| Session was reset | `410 Gone` | `{"error": "Session was reset", "message": "This conversation has been saved and reset. Please start a new chat to continue.", "code": "SESSION_RESET"}` |
| Invalid message format | `400 Bad Request` | Validation error details |

---

### **3. Get Chat History**
Retrieve all messages for a session (works for both active and persisted sessions).

**Endpoint:** `GET /api/chat/history/:sessionId`

**Request:** No body required

**Response:** `200 OK`
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "messages": [
    {
      "messageId": "msg-1",
      "content": "What's the latest news about AI?",
      "sender": "user",
      "timestamp": "2025-09-26T10:31:00.000Z"
    },
    {
      "messageId": "msg-2", 
      "content": "Based on recent news, AI developments include...",
      "sender": "assistant",
      "timestamp": "2025-09-26T10:31:15.000Z"
    }
  ]
}
```

**Data Source Priority:**
1. **Redis first** (active sessions)
2. **PostgreSQL fallback** (persisted sessions)

**Edge Cases:**

| Case | Status | Response |
|------|--------|----------|
| Session/messages not found | `404 Not Found` | `{"error": "Session or messages not found"}` |
| Invalid sessionId format | `400 Bad Request` | Validation error |

---

### **4. Reset Session (Persist & Delete)**
Saves the conversation to PostgreSQL permanently and removes it from Redis. This is the "Reset Chat" functionality.

**Endpoint:** `DELETE /api/sessions/:sessionId`

**Request:** No body required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

**Process Flow:**
1. Retrieve session data from Redis
2. Retrieve all messages from Redis  
3. **Persist session to PostgreSQL** (permanent storage)
4. **Persist all messages to PostgreSQL** (permanent storage)
5. **Flush session from Redis** (clear cache)
6. Return success response

**Storage Changes:**
- **Before:** Active session in Redis
- **After:** Persisted session in PostgreSQL, Redis cleared

**Edge Cases:**

| Case | Status | Response |
|------|--------|----------|
| Session not found in Redis | `404 Not Found` | `{"error": "Session not found"}` |
| Database persistence fails | `500 Internal Server Error` | Error logged, Redis not cleared |

---

### **5. List User's Previous Sessions**
Get specific sessions by their IDs (user's previous sessions from localStorage). Only returns sessions that were explicitly reset/saved.

**Endpoint:** `GET /api/sessions`

**Query Parameters:**
- `sessionIds` (required): Comma-separated list of session IDs from localStorage
- `limit` (optional): Number of sessions to return (1-100, default: 20)
- `offset` (optional): Number of sessions to skip (default: 0)

**Request Example:**
```
GET /api/sessions?sessionIds=123e4567-e89b-12d3-a456-426614174000,789e0123-f45g-67h8-i901-234567890123&limit=10&offset=0
```

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "sessionId": "123e4567-e89b-12d3-a456-426614174000",
      "title": "AI News Discussion",
      "createdAt": "2025-09-26T10:30:00.000Z"
    },
    {
      "sessionId": "789e0123-f45g-67h8-i901-234567890123", 
      "title": "Tech Updates",
      "createdAt": "2025-09-25T15:20:00.000Z"
    }
  ],
  "total": 2
}
```

**Data Source:** PostgreSQL only (persisted sessions)

**Privacy:** Only returns sessions with IDs provided by the frontend. No session data is exposed to other users.

**Edge Cases:**

| Case | Response |
|------|----------|
| No sessionIds provided | `{"sessions": [], "total": 0}` |
| Invalid UUID format | Filters out invalid IDs, returns valid ones |
| Session not found in DB | Not included in results |

---

### **6. Health Check**
Basic health check endpoint.

**Endpoint:** `GET /api/health`

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-09-26T10:30:00.000Z"
}
```

---

## 🔄 **Session Lifecycle**

### **Active Session (Redis)**
```
1. POST /api/sessions → Create in Redis (24h TTL)
2. POST /api/chat → Chat messages stored in Redis
3. GET /api/chat/history → Read from Redis
4. [Auto-expire after 24h] → Data vanishes
```

### **Persisted Session (PostgreSQL)**
```
1. DELETE /api/sessions/:id → Persist Redis → DB, Clear Redis
2. GET /api/sessions → List persisted sessions
3. GET /api/chat/history/:id → Read from PostgreSQL
```

---

## ⚡ **Rate Limits**

| Endpoint | Limit | Window |
|----------|-------|---------|
| `POST /api/sessions` | 5 requests | 1 minute |
| `POST /api/chat` | 20 requests | 1 minute |
| All other endpoints | 100 requests | 15 minutes |

---

## 🚨 **Error Responses**

### **Validation Errors (400)**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "message",
      "message": "Message is required",
      "code": "invalid_type"
    }
  ]
}
```

### **Not Found (404)**
```json
{
  "error": "Session not found"
}
```

### **Session Reset (410)**
```json
{
  "error": "Session was reset",
  "message": "This conversation has been saved and reset. Please start a new chat to continue.",
  "code": "SESSION_RESET"
}
```

### **Rate Limited (429)**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

### **Server Error (500)**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 📊 **Data Models**

### **Session**
```typescript
{
  sessionId: string;        // UUID
  title?: string;           // Auto-generated from first message
  createdAt: Date;          // ISO timestamp
}
```

### **Message**
```typescript
{
  messageId: string;        // UUID
  content: string;          // Message text
  sender: 'user' | 'assistant';
  timestamp: Date;          // ISO timestamp
}
```

---

## 🧪 **Example Usage Flow**

### **1. Start New Chat**
```bash
# Create session
curl -X POST http://localhost:3000/api/sessions
# Response: {"sessionId": "abc-123", "createdAt": "..."}
```

### **2. Send Messages**
```bash
# Send message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "message": "What is happening with AI?"}'
# Response: {"message": "Based on recent news...", "messageId": "msg-456", "timestamp": "..."}
```

### **3. Get Chat History**
```bash
# Get history
curl http://localhost:3000/api/chat/history/abc-123
# Response: {"sessionId": "abc-123", "messages": [...]}
```

### **4. Reset Chat (Save & Clear)**
```bash
# Reset/persist session
curl -X DELETE http://localhost:3000/api/sessions/abc-123
# Response: {"success": true, "message": "Session deleted successfully"}
# Result: Conversation saved to DB, cleared from Redis
```

### **5. View Past Conversations**
```bash
# List persisted sessions
curl http://localhost:3000/api/sessions
# Response: {"sessions": [...], "total": 10}

# View specific past conversation
curl http://localhost:3000/api/chat/history/abc-123
# Response: Messages from PostgreSQL (persisted)
```

---

## 🔧 **Technical Notes**

### **Storage Strategy**
- **Redis:** Active sessions (24h TTL, high performance)
- **PostgreSQL:** Persisted sessions (permanent, user-controlled)

### **AI Pipeline**
- **Pinecone:** Semantic search with integrated embeddings
- **Gemini:** Multi-turn conversation with news context

### **Performance**
- **Active chats:** Sub-100ms (Redis memory)
- **Persisted chats:** ~200ms (PostgreSQL disk)

This API provides fast, ephemeral conversations with optional long-term persistence controlled entirely by the user through the reset functionality.
