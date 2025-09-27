import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// Construct DATABASE_URL from individual Neon variables if needed
const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Construct from Neon DB environment variables
  if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER) {
    const password = process.env.PGPASSWORD ? `:${process.env.PGPASSWORD}` : '';
    const sslMode = process.env.PGSSLMODE ? `?sslmode=${process.env.PGSSLMODE}` : '?sslmode=require';
    const channelBinding = process.env.PGCHANNELBINDING ? `&channel_binding=${process.env.PGCHANNELBINDING}` : '';
    
    return `postgresql://${process.env.PGUSER}${password}@${process.env.PGHOST}/${process.env.PGDATABASE}${sslMode}${channelBinding}`;
  }
  
  throw new Error('Either DATABASE_URL or Neon DB variables (PGHOST, PGDATABASE, PGUSER) must be provided');
};

export default {
  schema: './src/models/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
} satisfies Config;
