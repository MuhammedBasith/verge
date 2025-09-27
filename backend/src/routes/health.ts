import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error';
import { checkDatabaseConnection } from '@/config/database';
import { checkRedisConnection } from '@/config/redis';
import { logger } from '@/utils/logger';

const router = Router();

// Health check endpoint
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const checks: Record<string, { status: string; responseTime?: number; error?: string }> = {};

    // Check database
    try {
      const dbStart = Date.now();
      const dbHealthy = await checkDatabaseConnection();
      checks.database = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Redis
    try {
      const redisStart = Date.now();
      const redisHealthy = await checkRedisConnection();
      checks.redis = {
        status: redisHealthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Overall health status
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'unhealthy';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      services: checks,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
      },
    };

    // Log health check if any service is unhealthy
    if (!allHealthy) {
      logger.warn('Health check failed', {
        status: overallStatus,
        services: checks,
        service: 'health',
      });
    }

    res.status(allHealthy ? 200 : 503).json(response);
  }),
);

// Readiness probe (simpler check for k8s/docker)
router.get(
  '/ready',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }),
);

// Liveness probe (basic server responsiveness)
router.get(
  '/live',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }),
);

export default router;
