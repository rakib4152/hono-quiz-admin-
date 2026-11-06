import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true } as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT) || 3000;

const rawEnvDbUrl = (
  process.env.DATABASE_URL ||
  process.env.QUIZ_DATABASE_URL ||
  'mysql://u427015050_drizzlequiz:R.r.4152@srv1562.hstgr.io:3306/u427015050_drizzle'
).trim();

const defaultConnectionString = rawEnvDbUrl
  .replace(/^ysql:\/\//, 'mysql://')
  .replace(/\/u427015050_drizzlequiz(\?.*)?$/i, '/u427015050_drizzle$1');

const workerEnv = {
  ...process.env,
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  API_VERSION: process.env.API_VERSION || 'v1',
  DATABASE_URL: defaultConnectionString,
  CORS_ALLOWED_ORIGINS:
    process.env.CORS_ALLOWED_ORIGINS ||
    'https://jobexambd.com,https://www.jobexambd.com,http://localhost:3000,http://localhost:3002,http://localhost:5173',
  HYPERDRIVE: {
    connectionString: defaultConnectionString,
  },
};

const nodeExecutionCtx = {
  waitUntil(promise: Promise<unknown>) {
    Promise.resolve(promise).catch((err) => {
      console.error('[Hono waitUntil error]:', err);
    });
  },
  passThroughOnException() {},
  props: {},
};

const API_ROUTE_PREFIXES = [
  '/api',
  '/auth',
  '/health',
  '/db-health',
  '/poc',
  '/devices',
  '/internal',
];

async function startServer() {
  const { register } = await import('tsx/esm/api');
  register();

  const { app: honoApp } = await import('./apps/src/index.js');

  const expressApp = express();
  expressApp.disable('x-powered-by');

  const rawBodyParser = express.raw({ type: '*/*', limit: '10mb' });

  expressApp.use(
    API_ROUTE_PREFIXES,
    rawBodyParser,
    async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      try {
        const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
        const protocol = forwardedProto || req.protocol || 'http';
        const host =
          (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() ||
          req.get('host') ||
          `localhost:${port}`;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, String(value));
          }
        }

        const upperMethod = req.method.toUpperCase();
        const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';
        const bodyBytes =
          hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
            ? new Uint8Array(req.body)
            : undefined;

        const webRequest = new Request(fullUrl, {
          method: req.method,
          headers,
          body: bodyBytes,
        });

        const webResponse = await honoApp.fetch(webRequest, workerEnv as any, nodeExecutionCtx);

        res.status(webResponse.status);

        const getSetCookie = (webResponse.headers as any).getSetCookie;
        const setCookies: string[] =
          typeof getSetCookie === 'function' ? getSetCookie.call(webResponse.headers) : [];

        webResponse.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') return;
          res.setHeader(key, value);
        });

        if (setCookies.length > 0) {
          res.setHeader('set-cookie', setCookies);
        }

        const responseBuffer = Buffer.from(await webResponse.arrayBuffer());
        res.send(responseBuffer);
      } catch (err) {
        next(err);
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    expressApp.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    expressApp.use(express.static(distDir, { index: false }));
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  expressApp.listen(port, '0.0.0.0', () => {
    console.log(`[JobExamBD Full-Stack Server] Listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]:', err);
  process.exit(1);
});
