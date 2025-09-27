import { z } from 'zod';

// Chat schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().uuid(),
});

export const chatResponseSchema = z.object({
  message: z.string(),
  messageId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

// Session schemas
export const createSessionSchema = z.object({});

export const sessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(100),
});

// Query parameters schemas
export const sessionListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const sessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

// Response schemas
export const sessionListResponseSchema = z.object({
  sessions: z.array(
    z.object({
      sessionId: z.string().uuid(),
      title: z.string(),
      createdAt: z.string().datetime(),
    }),
  ),
  total: z.number().int().min(0),
});

export const messagesResponseSchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(
    z.object({
      messageId: z.string().uuid(),
      content: z.string(),
      sender: z.enum(['user', 'assistant']),
      timestamp: z.string().datetime(),
    }),
  ),
});

// Error schema
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
  }),
});

// Success response wrapper
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// News article schema
export const newsArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  url: z.string().url(),
  publishedAt: z.date(),
  source: z.string(),
  embedding: z.array(z.number()).optional(),
});

// Environment variables schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(parseInt(process.env.PORT ?? '3000')),
  HOST: z.string().default(process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),
  // Database - support both DATABASE_URL and individual Neon DB variables
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGSSLMODE: z.string().optional(),
  PGCHANNELBINDING: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TTL: z.coerce.number().default(3600),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USERNAME: z.string().default('default'),
  GEMINI_API_KEY: z.string().min(1),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_ENV: z.string().default('us-east-1'),
  INDEX_NAME: z.string().default('news-embeddings'),
  NAMESPACE: z.string().default('news'),
  TOP_K_RESULTS: z.coerce.number().default(5),
  SESSION_TTL: z.coerce.number().default(86400),
  MAX_MESSAGES_PER_SESSION: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
});

// Type exports
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;
export type SessionParams = z.infer<typeof sessionParamsSchema>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type MessagesResponse = z.infer<typeof messagesResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type NewsArticle = z.infer<typeof newsArticleSchema>;
export type EnvConfig = z.infer<typeof envSchema>;
