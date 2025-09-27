import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { database as dbConfig } from '@/config';
import { logger, logDatabaseOperation } from '@/utils/logger';
import * as schema from '@/models/schema';

// Create connection with SSL configuration for Neon DB
const connection = postgres(dbConfig.url, {
  max: dbConfig.maxConnections || 20,
  idle_timeout: dbConfig.idleTimeout || 30000,
  ssl: 'require', // Required for Neon DB
  onnotice: () => {}, // Suppress notices in production
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL
  },
});

// Create drizzle instance
export const db = drizzle(connection, {
  schema,
  logger: {
    logQuery: (query: string, params: unknown[]) => {
      const start = Date.now();
      logger.debug('Database Query', {
        query: query.substring(0, 200), // Truncate long queries
        params: params.length > 0 ? params : undefined,
        service: 'database',
      });

      // Return a promise that logs the duration
      return Promise.resolve().then(() => {
        const duration = Date.now() - start;
        logDatabaseOperation('query', 'unknown', duration);
      });
    },
  },
});

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const start = Date.now();
    await connection`SELECT 1`;
    const duration = Date.now() - start;

    logDatabaseOperation('health_check', 'system', duration);
    logger.info('Database connection established successfully', {
      duration: `${duration}ms`,
      service: 'database',
    });

    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'database',
    });
    return false;
  }
};

// Graceful shutdown
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await connection.end();
    logger.info('Database connection closed successfully', {
      service: 'database',
    });
  } catch (error) {
    logger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'database',
    });
  }
};

// Database utilities
export const withTransaction = async <T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    const result = await db.transaction(callback);
    const duration = Date.now() - start;

    logDatabaseOperation('transaction', 'multiple', duration);
    logger.debug('Database transaction completed successfully', {
      duration: `${duration}ms`,
      service: 'database',
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    logger.error('Database transaction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      service: 'database',
    });

    throw error;
  }
};

// Export connection for direct use if needed
export { connection };
export default db;
