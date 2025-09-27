import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { SECURITY_CONFIG } from '@/config';
import { logger } from '@/utils/logger';
import { RateLimitError } from './error';

// Rate limiting middleware
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options?.windowMs ?? SECURITY_CONFIG.rateLimitWindowMs,
    max: options?.max ?? SECURITY_CONFIG.rateLimitMax,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options?.message ?? 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests ?? false,
    handler: (req: Request) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        service: 'rate_limiter',
      });

      throw new RateLimitError();
    },
  });
};

// General API rate limiter
export const apiRateLimit = createRateLimiter();

// Stricter rate limiter for chat endpoints
export const chatRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many chat requests, please slow down',
});

// Session creation rate limiter
export const sessionRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 sessions per minute
  message: 'Too many session creation requests',
});

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id =
    req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.set('X-Request-ID', id);
  next();
};

// Request timeout middleware
export const timeout = (ms: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          url: req.url,
          method: req.method,
          timeout: `${ms}ms`,
          requestId: req.get('X-Request-ID'),
          service: 'timeout',
        });

        res.status(408).json({
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
          },
        });
      }
    }, ms);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};

// Content type validation
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      next();
      return;
    }

    const contentType = req.get('Content-Type');
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      logger.warn('Invalid content type', {
        contentType,
        allowedTypes,
        url: req.url,
        method: req.method,
        service: 'content_type_validator',
      });

      res.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};

// Body size validation
export const validateBodySize = (maxSize: number = 1024 * 1024) => {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');

    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Request body too large', {
        contentLength,
        maxSize,
        url: req.url,
        method: req.method,
        service: 'body_size_validator',
      });

      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body too large. Maximum size: ${maxSize} bytes`,
        },
      });
      return;
    }

    next();
  };
};

// CORS preflight handler
export const handlePreflight = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  next();
};
