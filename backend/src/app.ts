import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import { corsOrigin, isDevelopment } from '@/config';
import { logger, morganStream } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/error';
import {
  apiRateLimit,
  requestId,
  timeout,
  validateContentType,
  validateBodySize,
  securityHeaders,
} from '@/middleware/security';

// Import routes
import chatRoutes from '@/routes/chat';
import sessionRoutes from '@/routes/sessions';
import healthRoutes from '@/routes/health';

const app = express();

app.set('trust proxy', 1);

// security middleware
app.use(
  helmet({
    ...(isDevelopment() ? { contentSecurityPolicy: false } : {}),
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(securityHeaders);
app.use(requestId);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID'],
  }),
);

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // only compress responses larger than 1KB
  }),
);

app.use(
  express.json({
    limit: '1mb',
    strict: true,
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  }),
);

app.use(
  morgan(
    isDevelopment()
      ? 'dev'
      : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" ' +
        ':status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    {
      stream: morganStream,
      skip: req => {
        return !isDevelopment() && req.url === '/api/health';
      },
    },
  ),
);

app.use(timeout(30000)); // 30 seconds

// content type validation
app.use(validateContentType(['application/json']));

// body size validation
app.use(validateBodySize(1024 * 1024)); // 1MB


app.use('/api', apiRateLimit);

app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'verge backend',
    version: '1.0.0',
    description: 'RAG-based news chatbot backend with vector search and session management',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      sessions: '/api/sessions',
    },
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', {
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

  process.exit(1);
});

export default app;
