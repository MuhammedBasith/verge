import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Sessions table - simplified
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().unique(),
    title: varchar('title', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  table => ({
    sessionIdIdx: index('sessions_session_id_idx').on(table.sessionId),
    createdAtIdx: index('sessions_created_at_idx').on(table.createdAt),
  }),
);

// Messages table - simplified
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').notNull().unique(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.sessionId, {
        onDelete: 'cascade',
      }),
    content: text('content').notNull(),
    sender: varchar('sender', { length: 20 }).notNull(), // 'user' or 'assistant'
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => ({
    messageIdIdx: index('messages_message_id_idx').on(table.messageId),
    sessionIdIdx: index('messages_session_id_idx').on(table.sessionId),
    timestampIdx: index('messages_timestamp_idx').on(table.timestamp),
  }),
);

// News articles table
export const newsArticles = pgTable(
  'news_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id').notNull().unique(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    url: text('url').notNull(),
    publishedAt: timestamp('published_at').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    author: varchar('author', { length: 255 }),
    category: varchar('category', { length: 100 }),
    tags: jsonb('tags'), // Array of strings
    embedding: jsonb('embedding'), // Vector embedding as JSON array
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  table => ({
    articleIdIdx: index('news_articles_article_id_idx').on(table.articleId),
    urlIdx: index('news_articles_url_idx').on(table.url),
    publishedAtIdx: index('news_articles_published_at_idx').on(table.publishedAt),
    sourceIdx: index('news_articles_source_idx').on(table.source),
    createdAtIdx: index('news_articles_created_at_idx').on(table.createdAt),
    categoryIdx: index('news_articles_category_idx').on(table.category),
  }),
);


// Define relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.sessionId],
  }),
}));

// Export types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewNewsArticle = typeof newsArticles.$inferInsert;
