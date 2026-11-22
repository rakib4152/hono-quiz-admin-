import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR_CANDIDATES = [
  path.resolve(currentDir, 'public'),
  path.resolve(process.cwd(), 'dist', 'public'),
  path.resolve(currentDir, '..', 'dist', 'public'),
];

const PUBLIC_DIR =
  PUBLIC_DIR_CANDIDATES.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || null;

const API_PREFIXES = ['/api', '/auth', '/health', '/db-health', '/poc', '/devices', '/internal'];

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function isApiPathname(pathname: string): boolean {
  return API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function serveFrontendAsset(req: Request): Promise<Response | null> {
  if (!PUBLIC_DIR) return null;
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;

  const url = new URL(req.url);
  if (isApiPathname(url.pathname)) return null;

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const relativePath = decodedPathname.replace(/^\/+/, '');
  const segments = relativePath.split('/').filter(Boolean);
  if (
    segments.some(
      (seg) =>
        seg === '..' ||
        seg.startsWith('.') ||
        seg.toLowerCase() === 'env.txt'
    )
  ) {
    return new Response('Forbidden', { status: 403 });
  }

  const targetPath = relativePath
    ? path.resolve(PUBLIC_DIR, relativePath)
    : path.join(PUBLIC_DIR, 'index.html');

  if (targetPath !== PUBLIC_DIR && !targetPath.startsWith(PUBLIC_DIR + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  let fileToServe: string | null = null;
  let isIndexFallback = false;

  try {
    const stat = await fsp.stat(targetPath);
    if (stat.isFile()) {
      fileToServe = targetPath;
    }
  } catch {
    // File not found; fall back to SPA index.html for extensionless client routes
  }

  if (!fileToServe) {
    const hasExtension = path.extname(relativePath) !== '';
    if (hasExtension) {
      return new Response('Not Found', { status: 404 });
    }
    fileToServe = path.join(PUBLIC_DIR, 'index.html');
    isIndexFallback = true;
  }

  try {
    const data = await fsp.readFile(fileToServe);
    const ext = path.extname(fileToServe).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHashedAsset =
      !isIndexFallback && decodedPathname.startsWith('/assets/');
    const cacheControl =
      ext === '.html'
        ? 'no-cache, no-store, must-revalidate'
        : isHashedAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600';

    return new Response(req.method === 'HEAD' ? null : data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch {
    return null;
  }
}

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: async (req) => {
      const staticResponse = await serveFrontendAsset(req);
      if (staticResponse) {
        return staticResponse;
      }
      return app.fetch(req);
    },
    port,
  },
  (info) => {
    console.log(
      `[Hono Server] Listening on http://0.0.0.0:${info.port} (dashboard=${PUBLIC_DIR ? 'enabled' : 'api-only'})`
    );
  }
);

