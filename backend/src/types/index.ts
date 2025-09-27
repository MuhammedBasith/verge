export interface Message {
  messageId: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export interface Session {
  sessionId: string;
  title?: string | undefined;
  createdAt: Date;
}

export interface NewsSource {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: Date;
  source?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  source: string;
  embedding?: number[];
}

export interface ChatResponse {
  message: string;
  messageId: string;
  timestamp: string;
}

export interface SessionResponse {
  sessionId: string;
  createdAt: string;
}

export interface SessionListResponse {
  sessions: SessionInfo[];
  total: number;
}

export interface SessionInfo {
  sessionId: string;
  title: string;
  createdAt: string;
}

export interface MessagesResponse {
  sessionId: string;
  messages: Message[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface SearchResult {
  document: NewsArticle;
  score: number;
  rank: number;
}

export interface RAGContext {
  query: string;
  retrievedDocuments: SearchResult[];
  generatedResponse: string;
  sources: NewsSource[];
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: Date;
  ttl: number;
}

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  idleTimeout?: number;
}

export interface RedisConfig {
  url: string;
  password?: string;
  ttl: number;
  maxRetries?: number;
}

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  namespace: string;
  topK: number;
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  corsOrigin: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  pinecone: PineconeConfig;
  geminiApiKey: string;
  logLevel: string;
  logFile: string;
}
