import winston from 'winston';
import path from 'path';
import { logLevel, logFile, nodeEnv } from '@/config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  }),
);

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel,
    }),
  );
}

// File transports
transports.push(
  // All logs
  new winston.transports.File({
    filename: path.resolve(logFile),
    format: logFormat,
    level: logLevel,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }),

  // Error logs only
  new winston.transports.File({
    filename: path.resolve(path.dirname(logFile), 'error.log'),
    format: logFormat,
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }),
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
  // Prevent Winston from exiting on handled exceptions
  handleExceptions: true,
  handleRejections: true,
});

// Create a stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim(), { service: 'http' });
  },
};

// Utility functions for structured logging
export const logWithContext = (
  level: string,
  message: string,
  context: Record<string, unknown> = {},
): void => {
  logger.log(level, message, {
    timestamp: new Date().toISOString(),
    ...context,
  });
};

export const logError = (error: Error, context: Record<string, unknown> = {}): void => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context,
  });
};

export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  context: Record<string, unknown> = {},
): void => {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString(),
    service: 'http',
    ...context,
  });
};

export const logRAGOperation = (
  operation: string,
  query: string,
  results: number,
  duration: number,
  context: Record<string, unknown> = {},
): void => {
  logger.info('RAG Operation', {
    operation,
    query: query.substring(0, 100), // Truncate long queries
    results,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    service: 'rag',
    ...context,
  });
};

export const logCacheOperation = (
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  context: Record<string, unknown> = {},
): void => {
  logger.debug('Cache Operation', {
    operation,
    key,
    timestamp: new Date().toISOString(),
    service: 'cache',
    ...context,
  });
};

export const logDatabaseOperation = (
  operation: string,
  table: string,
  duration: number,
  context: Record<string, unknown> = {},
): void => {
  logger.debug('Database Operation', {
    operation,
    table,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    service: 'database',
    ...context,
  });
};

// Export default logger
export default logger;
