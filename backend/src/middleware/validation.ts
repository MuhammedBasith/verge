import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@/utils/logger';

// Validation middleware factory
export const validate = (schema: { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate request parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      // Validate query parameters (don't modify req.query directly as it's read-only)
      if (schema.query) {
        const parsedQuery = schema.query.parse(req.query);
        // Store parsed query in a custom property for route handlers to use
        (req as any).parsedQuery = parsedQuery;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Validation error', {
          url: req.url,
          method: req.method,
          errors: validationErrors,
          service: 'validation',
        });

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationErrors,
          },
        });
        return;
      }

      logger.error('Unexpected validation error', {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'validation',
      });

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    }
  };
};
