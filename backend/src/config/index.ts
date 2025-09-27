import dotenv from 'dotenv';
import { envSchema, type EnvConfig } from '@/schemas';
import type { AppConfig } from '@/types';

// Load environment variables
dotenv.config();

// Validate and parse environment variables
const parseEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
};

const env = parseEnv();

// Construct DATABASE_URL from Neon DB variables if DATABASE_URL is not provided
const getDatabaseUrl = (): string => {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  // Construct from individual Neon DB environment variables
  if (env.PGHOST && env.PGDATABASE && env.PGUSER) {
    const password = env.PGPASSWORD ? `:${env.PGPASSWORD}` : '';
    const sslMode = env.PGSSLMODE ? `?sslmode=${env.PGSSLMODE}` : '?sslmode=require';
    const channelBinding = env.PGCHANNELBINDING ? `&channel_binding=${env.PGCHANNELBINDING}` : '';

    return `postgresql://${env.PGUSER}${password}@${env.PGHOST}/${env.PGDATABASE}${sslMode}${channelBinding}`;
  }

  throw new Error(
    'Either DATABASE_URL or Neon DB variables (PGHOST, PGDATABASE, PGUSER) must be provided',
  );
};

// Create application configuration
export const config: AppConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT) : env.PORT,
  host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : env.HOST,
  nodeEnv: env.NODE_ENV,
  corsOrigin: env.CORS_ORIGIN,

  database: {
    url: getDatabaseUrl(),
    maxConnections: 20,
    idleTimeout: 30000,
  },

  redis: {
    url: env.REDIS_URL ?? 'redis://localhost:6379', // fallback for compatibility
    ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
    ttl: env.REDIS_TTL,
    maxRetries: 3,
  },

  pinecone: {
    apiKey: env.PINECONE_API_KEY,
    environment: env.PINECONE_ENV,
    indexName: env.INDEX_NAME,
    namespace: env.NAMESPACE,
    topK: env.TOP_K_RESULTS,
  },

  geminiApiKey: env.GEMINI_API_KEY,
  logLevel: env.LOG_LEVEL,
  logFile: env.LOG_FILE,
};

// Export individual configurations for convenience
export const {
  port,
  host,
  nodeEnv,
  corsOrigin,
  database,
  redis,
  pinecone,
  geminiApiKey,
  logLevel,
  logFile,
} = config;

// Additional constants
export const SESSION_CONFIG = {
  ttl: env.SESSION_TTL,
  maxMessages: env.MAX_MESSAGES_PER_SESSION,
};

export const SECURITY_CONFIG = {
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
};

// Helper functions
export const isDevelopment = (): boolean => nodeEnv === 'development';
export const isProduction = (): boolean => nodeEnv === 'production';
export const isTest = (): boolean => nodeEnv === 'test';
