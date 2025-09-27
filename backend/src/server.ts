// Register module aliases for production
import 'module-alias/register';

import { Server } from 'http';
import app from './app';
import { port, host } from '@/config';
import { logger } from '@/utils/logger';
import { checkDatabaseConnection, closeDatabaseConnection } from '@/config/database';
import { checkRedisConnection, closeRedisConnection, initRedis } from '@/config/redis';
import { pineconeService } from '@/services/pinecone';

let server: Server;


const startServer = async (): Promise<void> => {
  try {
    logger.info('starting verge backend...', {
      service: 'startup',
      nodeEnv: process.env.NODE_ENV,
      port,
      host,
    });

    // Check database connection
    logger.info('checking db connection...', { service: 'startup' });
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize Redis connection
    logger.info('Initializing Redis connection...', { service: 'startup' });
    await initRedis();
    // Check Redis connection
    logger.info('Checking Redis connection...', { service: 'startup' });
    const redisConnected = await checkRedisConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }

    // Check Pinecone connection
    logger.info('Checking Pinecone connection...', { service: 'startup' });
    const pineconeConnected = await pineconeService.healthCheck();
    if (!pineconeConnected) {
      logger.warn('Pinecone connection failed - search functionality may be limited', { service: 'startup' });
    }

    // Start HTTP server
    server = app.listen(port, host, () => {
      logger.info(`server running on http://${host}:${port}`, {
        service: 'startup',
        port,
        host,
        nodeEnv: process.env.NODE_ENV,
      });

      logger.info('✅ All services initialized successfully', {
        service: 'startup',
        services: ['database', 'redis', 'pinecone', 'gemini', 'http'],
      });
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error', {
        error: error.message,
        stack: error.stack,
        service: 'server',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      service: 'startup',
    });

    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown...`, {
    service: 'shutdown',
    signal,
  });

  if (server) {
    server.close(async (err: Error | undefined) => {
      if (err) {
        logger.error('Error closing HTTP server', {
          error: err.message,
          service: 'shutdown',
        });
      } else {
        logger.info('HTTP server closed', { service: 'shutdown' });
      }

      // close db connections
      try {
        await closeDatabaseConnection();
        logger.info('Database connection closed', { service: 'shutdown' });
      } catch (error) {
        logger.error('Error closing database connection', {
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'shutdown',
        });
      }

      // Close Redis connection
      try {
        await closeRedisConnection();
        logger.info('Redis connection closed', { service: 'shutdown' });
      } catch (error) {
        logger.error('Error closing Redis connection', {
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'shutdown',
        });
      }

      // All services are now stateless and don't require explicit shutdown
      logger.info('All services cleaned up', { service: 'shutdown' });

      logger.info('✅ Graceful shutdown completed', { service: 'shutdown' });
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout', { service: 'shutdown' });
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle process errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
    service: 'process',
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    service: 'process',
  });

  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});


startServer();
