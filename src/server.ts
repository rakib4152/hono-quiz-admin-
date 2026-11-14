import 'dotenv/config';
import { serve } from '@hono/node-server';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { app } from '../apps/src/index.ts';
import * as schema from '../packages/database/src/schema.ts';

function normalizeDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/^ysql:\/\//, 'mysql://')
    .replace(/\/u427015050_drizzlequiz(\?.*)?$/i, '/u427015050_drizzle$1');
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

export const pool = databaseUrl ? mysql.createPool(databaseUrl) : null;
export const db = pool ? drizzle(pool, { schema, mode: 'default' }) : null;

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[Hono API Server] Listening on http://0.0.0.0:${info.port}`);
  }
);
