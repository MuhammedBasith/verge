import { createClient } from 'redis';
import { logger, logCacheOperation } from '@/utils/logger';

// Get Redis configuration from environment
const getRedisConfig = () => {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379');
  const username = process.env.REDIS_USERNAME ?? 'default';
  const password = process.env.REDIS_PASSWORD;

  // Log Redis configuration (without password)
  logger.info('Redis configuration loaded', {
    host,
    port,
    username,
    hasPassword: !!password,
    service: 'redis',
  });

  const config: any = {
    username,
    socket: {
      host,
      port,
    },
  };

  if (password) {
    config.password = password;
  }

  return config;
};

// Create Redis client with environment configuration
export const redis = createClient(getRedisConfig());

// Error handling
redis.on('error', (err: Error) => {
  logger.error('Redis Client Error', {
    error: err.message,
    service: 'redis',
  });
});

// Connection events
redis.on('connect', () => {
  logger.info('Redis connection established successfully', {
    service: 'redis',
  });
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands', {
    service: 'redis',
  });
});

redis.on('end', () => {
  logger.warn('Redis connection closed', {
    service: 'redis',
  });
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...', {
    service: 'redis',
  });
});

// Initialize Redis connection
const initRedis = async () => {
  try {
    await redis.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'redis',
    });
    throw error;
  }
};

// Export the initialization function
export { initRedis };

// Cache utility class
export class CacheService {
  private readonly defaultTTL = 3600; // 1 hour default

  async get<T>(key: string): Promise<T | null> {
    try {
      const start = Date.now();
      const value = await redis.get(key);
      const duration = Date.now() - start;

      if (value) {
        logCacheOperation('hit', key, { duration: `${duration}ms` });
        return JSON.parse(value);
      }

      logCacheOperation('miss', key, { duration: `${duration}ms` });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const start = Date.now();
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await redis.setEx(key, expiry, serialized);
      const duration = Date.now() - start;

      logCacheOperation('set', key, {
        duration: `${duration}ms`,
        ttl: `${expiry}s`,
        size: `${serialized.length} bytes`,
      });

      return true;
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const start = Date.now();
      const result = await redis.del(key);
      const duration = Date.now() - start;

      logCacheOperation('delete', key, {
        duration: `${duration}ms`,
        deleted: result > 0,
      });

      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      const result = await redis.incrBy(key, by);
      return result;
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return null;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return [];
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await redis.del(keys);
      logger.info('Cache pattern flushed', {
        pattern,
        deleted: result,
        service: 'redis',
      });

      return result;
    } catch (error) {
      logger.error('Cache flush pattern error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return 0;
    }
  }

  // Session-specific methods
  async setSessionData(sessionId: string, data: unknown, ttl?: number): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.set(key, data, ttl);
  }

  async getSessionData<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return this.get<T>(key);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.delete(key);
  }

  async extendSession(sessionId: string, ttl?: number): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.expire(key, ttl || this.defaultTTL);
  }

  // Chat history methods
  async setChatHistory(sessionId: string, messages: unknown[], ttl?: number): Promise<boolean> {
    const key = `chat:${sessionId}`;
    return this.set(key, messages, ttl);
  }

  async getChatHistory<T>(sessionId: string): Promise<T[] | null> {
    const key = `chat:${sessionId}`;
    return this.get<T[]>(key);
  }

  async appendMessage(sessionId: string, message: unknown, ttl?: number): Promise<boolean> {
    try {
      const key = `chat:${sessionId}`;
      const messages = (await this.get<unknown[]>(key)) || [];
      messages.push(message);

      return this.set(key, messages, ttl);
    } catch (error) {
      logger.error('Cache append message error', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'redis',
      });
      return false;
    }
  }
}

// Create singleton instance
export const cache = new CacheService();

// Health check
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const start = Date.now();
    await redis.ping();
    const duration = Date.now() - start;

    logger.info('Redis connection health check passed', {
      duration: `${duration}ms`,
      service: 'redis',
    });

    return true;
  } catch (error) {
    logger.error('Redis connection health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'redis',
    });
    return false;
  }
};

// Graceful shutdown
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redis.disconnect();
    logger.info('Redis connection closed successfully', {
      service: 'redis',
    });
  } catch (error) {
    logger.error('Error closing Redis connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'redis',
    });
  }
};

export default redis;
