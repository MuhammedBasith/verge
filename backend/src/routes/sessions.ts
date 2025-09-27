import { Router, Request, Response } from 'express';
import { validate } from '@/middleware/validation';
import { asyncHandler, NotFoundError } from '@/middleware/error';
import { sessionRateLimit } from '@/middleware/security';
import {
  createSessionSchema,
  sessionResponseSchema,
  sessionListQuerySchema,
  sessionParamsSchema,
  updateSessionSchema,
  sessionListResponseSchema,
  messagesResponseSchema,
} from '@/schemas';
import { sessionService } from '@/services/session';
import { logger } from '@/utils/logger';
import type {
  SessionListQuery,
  SessionParams,
  UpdateSessionInput,
} from '@/schemas';

const router = Router();

/**
 * POST /api/sessions
 * Create a new chat session
 */
router.post(
  '/',
  sessionRateLimit,
  validate({ body: createSessionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Session creation requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      service: 'session_api',
    });

    const session = await sessionService.createSession();

    // Validate response schema
    const validatedResponse = sessionResponseSchema.parse(session);

    logger.info('Session created successfully', {
      sessionId: session.sessionId,
      service: 'session_api',
    });

    res.status(201).json(validatedResponse);
  }),
);

/**
 * GET /api/sessions?sessionIds=id1,id2,id3
 * Get specific sessions by their IDs (user's previous sessions from localStorage)
 */
router.get(
  '/',
  validate({ query: sessionListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionIds, limit, offset }: SessionListQuery = (req as any).parsedQuery || req.query;

    logger.debug('Sessions list requested', {
      sessionIdsCount: sessionIds?.length || 0,
      limit,
      offset,
      service: 'session_api',
    });

    // If no sessionIds provided, return empty result
    if (!sessionIds || sessionIds.length === 0) {
      const emptyResult = {
        sessions: [],
        total: 0,
      };

      const validatedResponse = sessionListResponseSchema.parse(emptyResult);
      res.json(validatedResponse);
      return;
    }

    const result = await sessionService.getSessionsByIds(sessionIds, limit, offset);

    // Validate response schema
    const validatedResponse = sessionListResponseSchema.parse(result);

    logger.debug('Sessions list retrieved', {
      count: result.sessions.length,
      total: result.total,
      service: 'session_api',
    });

    res.json(validatedResponse);
  }),
);

/**
 * GET /api/sessions/:sessionId/messages
 * Get all messages from a specific session
 */
router.get(
  '/:sessionId/messages',
  validate({ params: sessionParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId }: SessionParams = req.params as any;

    logger.debug('Session messages requested', {
      sessionId,
      service: 'session_api',
    });

    // Validate session exists
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    const messages = await sessionService.getSessionMessages(sessionId);

    const response = {
      sessionId,
      messages: messages.map(msg => ({
        messageId: msg.messageId,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString(),
      })),
    };

    // Validate response schema
    const validatedResponse = messagesResponseSchema.parse(response);

    logger.debug('Session messages retrieved', {
      sessionId,
      messageCount: messages.length,
      service: 'session_api',
    });

    res.json(validatedResponse);
  }),
);

/**
 * PATCH /api/sessions/:sessionId
 * Update session title
 */
router.patch(
  '/:sessionId',
  validate({
    params: sessionParamsSchema,
    body: updateSessionSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId }: SessionParams = req.params as any;
    const { title }: UpdateSessionInput = req.body;

    logger.info('Session title update requested', {
      sessionId,
      title,
      service: 'session_api',
    });

    // Validate session exists
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    await sessionService.updateSessionTitle(sessionId, title);

    const response = {
      sessionId,
      title,
      updatedAt: new Date().toISOString(),
    };

    logger.info('Session title updated', {
      sessionId,
      title,
      service: 'session_api',
    });

    res.json(response);
  }),
);

/**
 * DELETE /api/sessions/:sessionId
 * Delete a specific session
 */
router.delete(
  '/:sessionId',
  validate({ params: sessionParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId }: SessionParams = req.params as any;

    logger.info('Session deletion requested', {
      sessionId,
      service: 'session_api',
    });

    // Validate session exists
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    const deleted = await sessionService.deleteSession(sessionId);

    if (!deleted) {
      throw new Error('Failed to delete session');
    }

    const response = {
      success: true,
      message: 'Session deleted successfully',
    };

    logger.info('Session deleted', {
      sessionId,
      service: 'session_api',
    });

    res.json(response);
  }),
);

export default router;
