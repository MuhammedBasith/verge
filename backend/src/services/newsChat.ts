import { pineconeService } from './pinecone';
import { geminiService } from './gemini';
import { logger } from '@/utils/logger';

export interface ChatResponse {
  response: string;
  sources: Array<{
    id: string;
    text: string;
    score: number;
  }>;
}

export class NewsChatService {
  /**
   * Process user query: search Pinecone for relevant content, then generate response with Gemini
   */
  async processQuery(
    userQuery: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<ChatResponse> {
    try {
      logger.info('Processing user query', {
        query: userQuery.substring(0, 100),
        hasHistory: !!conversationHistory?.length,
        service: 'news_chat',
      });

      // 1. Search Pinecone for relevant content
      const searchResults = await pineconeService.searchSimilarContent(userQuery);

      if (searchResults.length === 0) {
        logger.warn('No relevant content found in Pinecone', {
          query: userQuery.substring(0, 100),
          service: 'news_chat',
        });

        return {
          response:
            'I couldn\'t find any relevant news content for your query. Please try rephrasing your question.',
          sources: [],
        };
      }

      // 2. Prepare context from search results
      const context = searchResults
        .map((result, index) => `[${index + 1}] ${result.text}`)
        .join('\n\n');

      // 3. Build conversation context (for future use if needed)
      // Note: Currently using conversationHistory directly in Gemini service

      // 4. Generate response using Gemini
      const response = await geminiService.generateResponseWithContext(
        userQuery,
        context,
        conversationHistory,
      );

      // 5. Format sources for response
      const sources = searchResults.map(result => ({
        id: result.id,
        text: result.text.substring(0, 200) + (result.text.length > 200 ? '...' : ''),
        score: Math.round(result.score * 100) / 100, // Round to 2 decimal places
      }));

      logger.info('Query processed successfully', {
        query: userQuery.substring(0, 100),
        responseLength: response.length,
        sourcesCount: sources.length,
        service: 'news_chat',
      });

      return {
        response,
        sources,
      };
    } catch (error) {
      logger.error('Failed to process query', {
        query: userQuery.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'news_chat',
      });

      return {
        response:
          'I\'m sorry, I encountered an error while processing your request. Please try again.',
        sources: [],
      };
    }
  }

  /**
   * Generate a title for the chat session based on the first user message
   */
  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const prompt = `Generate a short, descriptive title (max 50 characters) for a news chat conversation that starts with this user message:

"${firstMessage}"

The title should capture the main topic or theme. Respond with just the title, no quotes or extra text.`;

      const title = await geminiService.generateResponse(prompt);

      // Clean and truncate the title
      const cleanTitle = title
        .trim()
        .replace(/^["']|["']$/g, '')
        .substring(0, 50);

      return cleanTitle || 'News Chat';
    } catch (error) {
      logger.warn('Failed to generate chat title', {
        message: firstMessage.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'news_chat',
      });

      // Fallback: use first few words of the message
      return firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
    }
  }
}

// Create singleton instance
export const newsChatService = new NewsChatService();
