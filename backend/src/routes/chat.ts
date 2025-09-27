import { Router, Request, Response } from 'express';
import { validate } from '@/middleware/validation';
import { asyncHandler, NotFoundError } from '@/middleware/error';
import { chatRateLimit } from '@/middleware/security';
import {
  chatMessageSchema,
  chatResponseSchema,
  sessionParamsSchema,
  messagesResponseSchema,
} from '@/schemas';
import { sessionService } from '@/services/session';
import { GeminiError } from '@/services/gemini';
import { logger } from '@/utils/logger';
import type { ChatMessageInput, SessionParams } from '@/schemas';

const router = Router();

// Apply chat-specific rate limiting
router.use(chatRateLimit);

/**
 * POST /api/chat
 * Handle user messages and return RAG-based responses
 */
router.post(
  '/',
  validate({ body: chatMessageSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, sessionId }: ChatMessageInput = req.body;

    logger.info('Chat message received', {
      sessionId,
      messageLength: message.length,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      service: 'chat_api',
    });

    // Validate session exists in Redis (active sessions only)
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      // Check if this sessionId exists in DB (was previously reset)
      const messages = await sessionService.getSessionMessages(sessionId);
      if (messages.length > 0) {
        // Session was reset/persisted - no longer accepting new messages
        res.status(410).json({
          error: 'Session was reset',
          message: 'This conversation has been saved and reset. Please start a new chat to continue.',
          code: 'SESSION_RESET',
        });
        return;
      } else {
        // Session doesn't exist anywhere
        throw new NotFoundError('Session');
      }
    }

    try {
      // Process the message
      const { assistantMessage } = await sessionService.processMessage(sessionId, message);

      // Prepare response
      const response = {
        message: assistantMessage.content,
        messageId: assistantMessage.messageId,
        timestamp: assistantMessage.timestamp.toISOString(),
      };

      // Validate response schema
      const validatedResponse = chatResponseSchema.parse(response);

      logger.info('Chat response sent', {
        sessionId,
        messageId: assistantMessage.messageId,
        responseLength: assistantMessage.content.length,
        service: 'chat_api',
      });

      res.json(validatedResponse);
    } catch (error) {
      // Handle Gemini-specific errors
      if (error instanceof GeminiError) {
        logger.warn('Gemini API error in chat', {
          sessionId,
          errorCode: error.errorCode,
          statusCode: error.statusCode,
          message: error.message,
          service: 'chat_api',
        });

        res.status(error.statusCode).json({
          error: 'AI_SERVICE_ERROR',
          message: error.userMessage,
          code: error.errorCode,
          isGeminiError: true,
          details: {
            provider: 'Gemini AI',
            suggestion: error.statusCode === 429
              ? 'Please wait a moment before sending another message'
              : error.statusCode === 503
                ? 'The AI service is temporarily busy. Please try again in a few minutes'
                : 'Please try again or contact support if the issue persists',
          },
        });
        return;
      }

      // Re-throw other errors to be handled by global error handler
      throw error;
    }
  }),
);

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a specific session
 */
router.get(
  '/history/:sessionId',
  validate({ params: sessionParamsSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId }: SessionParams = req.params as any;

    logger.debug('Chat history requested', {
      sessionId,
      service: 'chat_api',
    });

    // Get messages first (works for both active and persisted sessions)
    const messages = await sessionService.getSessionMessages(sessionId);

    if (messages.length === 0) {
      throw new NotFoundError('Session or messages not found');
    }

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

    logger.debug('Chat history retrieved', {
      sessionId,
      messageCount: messages.length,
      service: 'chat_api',
    });

    res.json(validatedResponse);
  }),
);

export default router;
