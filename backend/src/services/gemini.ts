import { GoogleGenAI } from '@google/genai';
import { geminiApiKey } from '@/config';
import { logger } from '@/utils/logger';

// Custom error class for Gemini API errors
export class GeminiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public userMessage: string,
    public isGeminiError: boolean = true,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

// Map Gemini error responses to user-friendly messages
const mapGeminiError = (error: any): GeminiError => {
  const statusCode = error.status || error.statusCode || 500;
  const errorMessage = error.message || 'Unknown error';

  switch (statusCode) {
  case 400:
    if (errorMessage.includes('INVALID_ARGUMENT')) {
      return new GeminiError(
        errorMessage,
        400,
        'INVALID_REQUEST',
        'There was an issue with the request format. Please try again.',
      );
    }
    if (errorMessage.includes('FAILED_PRECONDITION')) {
      return new GeminiError(
        errorMessage,
        400,
        'BILLING_REQUIRED',
        'Gemini API requires billing to be enabled. This is a service configuration issue.',
      );
    }
    return new GeminiError(
      errorMessage,
      400,
      'BAD_REQUEST',
      'Invalid request. Please try again with a different message.',
    );

  case 403:
    return new GeminiError(
      errorMessage,
      403,
      'PERMISSION_DENIED',
      'API access denied. This is a service configuration issue.',
    );

  case 404:
    return new GeminiError(
      errorMessage,
      404,
      'NOT_FOUND',
      'Requested resource not found. Please try again.',
    );

  case 429:
    return new GeminiError(
      errorMessage,
      429,
      'RATE_LIMIT_EXCEEDED',
      'Gemini API rate limit exceeded. Please wait a moment and try again.',
    );

  case 500:
    return new GeminiError(
      errorMessage,
      500,
      'GEMINI_INTERNAL_ERROR',
      'Gemini AI service is experiencing issues. Please try again in a moment.',
    );

  case 503:
    return new GeminiError(
      errorMessage,
      503,
      'SERVICE_UNAVAILABLE',
      'Gemini AI service is temporarily overloaded. Please try again in a few minutes.',
    );

  case 504:
    return new GeminiError(
      errorMessage,
      504,
      'TIMEOUT',
      'Request timed out. Your message might be too long. Please try with a shorter message.',
    );

  default:
    return new GeminiError(
      errorMessage,
      statusCode,
      'UNKNOWN_ERROR',
      'An unexpected error occurred with the AI service. Please try again.',
    );
  }
};

export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.ai = new GoogleGenAI({});

    logger.info('Gemini service initialized', {
      model: 'gemini-2.5-flash',
      service: 'gemini',
    });
  }

  async generateResponseWithContext(
    query: string,
    context: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    try {
      const start = Date.now();

      logger.debug('Generating response with Gemini', {
        queryLength: query.length,
        contextLength: context.length,
        historyLength: conversationHistory.length,
        service: 'gemini',
      });

      // Build conversation history for Gemini chat
      const history = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.content }],
      }));

      // Create chat with history
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        history,
      });

      // Build the message with context
      const messageWithContext = `Context (Recent News):\n${context}\n\nUser Question: ${query}\n\nPlease provide a helpful response based on the news context above. Be factual and cite relevant information from the articles.`;

      // Send message
      const response = await chat.sendMessage({
        message: messageWithContext,
      });

      const duration = Date.now() - start;

      logger.info('Gemini response generated', {
        queryLength: query.length,
        responseLength: response.text?.length || 0,
        duration: `${duration}ms`,
        service: 'gemini',
      });

      return response.text?.trim() || 'No response generated';
    } catch (error) {
      logger.error('Gemini response generation failed', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'gemini',
      });

      // Throw mapped Gemini error instead of returning fallback
      throw mapGeminiError(error);
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const start = Date.now();

      // Create a simple chat for one-off responses (like title generation)
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        history: [],
      });

      const response = await chat.sendMessage({
        message: prompt,
      });

      const duration = Date.now() - start;

      logger.debug('Simple Gemini response generated', {
        promptLength: prompt.length,
        responseLength: response.text?.length || 0,
        duration: `${duration}ms`,
        service: 'gemini',
      });

      return response.text?.trim() || 'No response generated';
    } catch (error) {
      logger.error('Simple Gemini response generation failed', {
        prompt: prompt.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'gemini',
      });

      return 'I apologize, but I encountered an error generating a response. Please try again.';
    }
  }

  private generateFallbackResponse(query: string, context: string): string {
    if (!context || context.includes('No relevant news articles found')) {
      return `I apologize, but I couldn't find any recent news articles related to "${query}". Please try rephrasing your question or asking about a different topic.`;
    }

    return 'I found some relevant news articles, but I\'m having trouble generating a complete response at the moment. Please try again.';
  }
}

// Create singleton instance
export const geminiService = new GeminiService(geminiApiKey);
