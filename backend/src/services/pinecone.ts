import { Pinecone } from '@pinecone-database/pinecone';
import { pinecone as pineconeConfig } from '@/config';
import { logger } from '@/utils/logger';

// Initialize Pinecone client
const pc = new Pinecone({ apiKey: pineconeConfig.apiKey });

// Get the index
const index = pc.index(pineconeConfig.indexName).namespace(pineconeConfig.namespace);

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, any>;
}

export class PineconeService {
  /**
   * Search for semantically similar content using Pinecone's integrated embedding
   */
  async searchSimilarContent(query: string): Promise<SearchResult[]> {
    try {
      logger.debug('Searching Pinecone for similar content', {
        query: query.substring(0, 100),
        topK: pineconeConfig.topK,
        service: 'pinecone',
      });

      const results = await index.searchRecords({
        query: {
          topK: pineconeConfig.topK,
          inputs: { text: query },
        },
      });

      const searchResults: SearchResult[] = results.result.hits.map((hit: any) => ({
        id: hit.id ?? '',
        score: hit.score ?? 0,
        text: hit.fields?.chunk_text ?? hit.fields?.text ?? '',
        metadata: hit.fields,
      }));

      logger.debug('Pinecone search completed', {
        resultsCount: searchResults.length,
        topScore: searchResults[0]?.score ?? 0,
        service: 'pinecone',
      });

      return searchResults;
    } catch (error) {
      logger.error('Pinecone search failed', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'pinecone',
      });

      // Return empty results on error rather than throwing
      return [];
    }
  }

  /**
   * Health check for Pinecone connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get index stats
      const stats = await index.describeIndexStats();

      logger.info('Pinecone health check passed', {
        indexName: pineconeConfig.indexName,
        namespace: pineconeConfig.namespace,
        totalVectors: stats.totalRecordCount || 0,
        service: 'pinecone',
      });

      return true;
    } catch (error) {
      logger.error('Pinecone health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'pinecone',
      });

      return false;
    }
  }
}

// Create singleton instance
export const pineconeService = new PineconeService();
