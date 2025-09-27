import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '@/config/database';
import { cache } from '@/config/redis';
import { sessions, messages } from '@/models/schema';
import { SESSION_CONFIG } from '@/config';
import { logger } from '@/utils/logger';
import { newsChatService } from './newsChat';
import type { Session, Message, SessionInfo } from '@/types';

export class SessionService {
  private readonly sessionTTL = SESSION_CONFIG.ttl;
  private readonly maxMessages = SESSION_CONFIG.maxMessages;

  async createSession(): Promise<{ sessionId: string; createdAt: string }> {
    try {
      const sessionId = uuidv4();
      const now = new Date();

      // Store ONLY in Redis (no immediate DB write)
      await cache.setSessionData(
        sessionId,
        {
          sessionId,
          createdAt: now,
        },
        this.sessionTTL,
      );

      // Initialize empty chat history in Redis
      await cache.setChatHistory(sessionId, [], this.sessionTTL);

      logger.info('Session created (Redis-only)', {
        sessionId,
        service: 'session',
      });

      return {
        sessionId,
        createdAt: now.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      // Try cache first
      const cached = await cache.getSessionData<Session>(sessionId);
      if (cached) {
        return cached;
      }

      // Query database
      const result = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.sessionId, sessionId), eq(sessions.isActive, true)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const session = result[0];
      if (!session) {
        return null;
      }

      const sessionData: Session = {
        sessionId: session.sessionId,
        title: session.title ?? undefined,
        createdAt: session.createdAt,
      };

      // Cache for future requests
      await cache.setSessionData(sessionId, sessionData, this.sessionTTL);

      return sessionData;
    } catch (error) {
      logger.error('Failed to get session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      return null;
    }
  }


  async addMessage(
    sessionId: string,
    content: string,
    sender: 'user' | 'assistant',
  ): Promise<Message> {
    try {
      const messageId = uuidv4();
      const now = new Date();

      const message: Message = {
        messageId,
        content,
        sender,
        timestamp: now,
      };

      // Store ONLY in Redis (no immediate DB write)
      await cache.appendMessage(sessionId, message, this.sessionTTL);

      logger.debug('Message added (Redis-only)', {
        sessionId,
        messageId,
        sender,
        contentLength: content.length,
        service: 'session',
      });

      return message;
    } catch (error) {
      logger.error('Failed to add message to session', {
        sessionId,
        sender,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      // Try Redis cache first (active sessions)
      const cached = await cache.getChatHistory<any>(sessionId);
      if (cached && cached.length > 0) {
        // Normalize cached data (timestamps are strings from JSON serialization)
        return cached.map((msg: any) => ({
          messageId: msg.messageId,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp), // Convert string back to Date
        }));
      }

      // If not in Redis, check if it's a persisted session in DB
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(messages.timestamp);

      const sessionMessages: Message[] = result.map(msg => ({
        messageId: msg.messageId,
        content: msg.content,
        sender: msg.sender as 'user' | 'assistant',
        timestamp: msg.timestamp,
      }));

      // Don't cache DB results back to Redis (they're persisted conversations)
      return sessionMessages;
    } catch (error) {
      logger.error('Failed to get session messages', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      return [];
    }
  }

  async getSessions(
    userId?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sessions: SessionInfo[]; total: number }> {
    try {
      // Get sessions with pagination (active sessions only)
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.isActive, true))
        .orderBy(desc(sessions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sessions.id })
        .from(sessions)
        .where(eq(sessions.isActive, true));

      const total = countResult.length;

      const sessionInfos: SessionInfo[] = result.map(session => ({
        sessionId: session.sessionId,
        title: session.title ?? 'Untitled Session',
        createdAt: session.createdAt.toISOString(),
      }));

      logger.debug('Sessions retrieved', {
        count: sessionInfos.length,
        total,
        limit,
        offset,
        service: 'session',
      });

      return { sessions: sessionInfos, total };
    } catch (error) {
      logger.error('Failed to get sessions', {
        limit,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      return { sessions: [], total: 0 };
    }
  }

  async getSessionsByIds(
    sessionIds: string[],
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sessions: SessionInfo[]; total: number }> {
    try {
      // Validate all sessionIds are UUIDs
      const validSessionIds = sessionIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });

      if (validSessionIds.length === 0) {
        return { sessions: [], total: 0 };
      }

      // Get sessions by specific IDs (only from persisted sessions in DB)
      const result = await db
        .select()
        .from(sessions)
        .where(
          and(
            inArray(sessions.sessionId, validSessionIds),
            eq(sessions.isActive, true),
          ),
        )
        .orderBy(desc(sessions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for the provided session IDs
      const countResult = await db
        .select({ count: sessions.id })
        .from(sessions)
        .where(
          and(
            inArray(sessions.sessionId, validSessionIds),
            eq(sessions.isActive, true),
          ),
        );

      const total = countResult.length;

      const sessionInfos: SessionInfo[] = result.map((session: any) => ({
        sessionId: session.sessionId,
        title: session.title ?? 'Untitled Session',
        createdAt: session.createdAt.toISOString(),
      }));

      logger.debug('Sessions retrieved by IDs', {
        requestedCount: sessionIds.length,
        validCount: validSessionIds.length,
        foundCount: sessionInfos.length,
        total,
        limit,
        offset,
        service: 'session',
      });

      return { sessions: sessionInfos, total };
    } catch (error) {
      logger.error('Failed to get sessions by IDs', {
        sessionIdsCount: sessionIds.length,
        limit,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      return { sessions: [], total: 0 };
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      const cached = await cache.getSessionData<Session>(sessionId);
      if (cached) {
        cached.title = title;
        await cache.setSessionData(sessionId, cached, this.sessionTTL);
      }

      logger.info('Session title updated (Redis-only)', {
        sessionId,
        title,
        service: 'session',
      });
    } catch (error) {
      logger.error('Failed to update session title', {
        sessionId,
        title,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // PERSIST TO DATABASE BEFORE DELETION
      await this.persistSessionToDatabase(sessionId);

      // Remove from Redis cache (flush)
      await cache.deleteSession(sessionId);
      await cache.delete(`chat:${sessionId}`);

      logger.info('Session persisted to DB and flushed from Redis', {
        sessionId,
        service: 'session',
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      return false;
    }
  }

  private async persistSessionToDatabase(sessionId: string): Promise<void> {
    try {
      // Get session data from Redis
      const sessionData = await cache.getSessionData<Session>(sessionId);
      const sessionMessages = await cache.getChatHistory<Message>(sessionId);

      if (!sessionData) {
        logger.warn('No session data found in Redis to persist', { sessionId });
        return;
      }

      // Insert session into database
      await db.insert(sessions).values({
        sessionId: sessionData.sessionId,
        title: sessionData.title || null,
        createdAt: new Date(sessionData.createdAt), // Convert string to Date
        isActive: true,
      });

      // Insert all messages into database
      if (sessionMessages && sessionMessages.length > 0) {
        const messageValues = sessionMessages.map(msg => ({
          messageId: msg.messageId,
          sessionId,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp), // Convert string to Date
        }));

        await db.insert(messages).values(messageValues);
      }

      logger.info('Session and messages persisted to database', {
        sessionId,
        messageCount: sessionMessages?.length || 0,
        service: 'session',
      });
    } catch (error) {
      logger.error('Failed to persist session to database', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      throw error;
    }
  }

  async processMessage(
    sessionId: string,
    userMessage: string,
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    try {
      // Validate session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Add user message
      const userMsg = await this.addMessage(sessionId, userMessage, 'user');

      // Get conversation history for context
      const history = await this.getSessionMessages(sessionId);
      const conversationHistory = history
        .slice(-10) // Last 5 exchanges
        .filter(msg => msg.messageId !== userMsg.messageId) // Exclude the current user message
        .map(msg => ({
          role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }));

      // Process with Pinecone + Gemini
      const { response } = await newsChatService.processQuery(userMessage, conversationHistory);

      // Add assistant message
      const assistantMsg = await this.addMessage(sessionId, response, 'assistant');

      // Generate title if this is the first user message (excluding the one we just added)
      const userMessagesBeforeThis = history.filter(msg => msg.sender === 'user' && msg.messageId !== userMsg.messageId).length;

      logger.debug('Title generation check', {
        sessionId,
        userMessagesBeforeThis,
        hasTitle: !!session.title,
        shouldGenerateTitle: userMessagesBeforeThis === 0 && !session.title,
        service: 'session',
      });

      if (userMessagesBeforeThis === 0 && !session.title) {
        try {
          const title = await newsChatService.generateTitle(userMessage);
          await this.updateSessionTitle(sessionId, title);
          logger.info('Session title generated', {
            sessionId,
            title,
            service: 'session',
          });
        } catch (error) {
          logger.warn('Failed to generate session title', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error',
            service: 'session',
          });
        }
      }

      return { userMessage: userMsg, assistantMessage: assistantMsg };
    } catch (error) {
      logger.error('Failed to process message', {
        sessionId,
        message: userMessage.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'session',
      });
      throw error;
    }
  }
}

// Create singleton instance
export const sessionService = new SessionService();
