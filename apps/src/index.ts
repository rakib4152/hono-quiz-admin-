/**
 * Cloudflare Workers Hono Application Entry Point
 * Base Route: /api/v1
 * Microservices Architecture:
 * - Auth Service: auth_db (User, Session, Device)
 * - Quiz Service: quiz_db (Category, Exam, Subject, Topic, Quiz, Question, Option, QuizQuestion)
 * - Attempt Service: attempt_db (QuizAttempt, AttemptAnswer, Bookmark, SavedQuiz, OfflineSync)
 * - Payment Service: payment_db (Order, Payment, QuizAccess)
 * - Analytics Service: analytics_db (Badge, UserBadge, LeaderboardEntry)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppEnv } from './env.js';
import { createHealthHandler } from './routes/health.js';
import { handlePocCheck } from './routes/poc.js';

import quizApp, { quizService } from '@quiz-service';
import { attemptService } from '@attempt-service';
import { paymentService } from '@payment-service';
import { analyticsService } from '@analytics-service';
import { authService } from '@auth-service';

import {
  createDrizzleClient,
  type DrizzleDB,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
  endDrizzleConnection,
} from '../../packages/database/src/index.js';

export {
  createDrizzleClient,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
  type DrizzleDB,
};

const startupTime = Date.now();

/**
 * Main Hono Application Instance
 */
export const app = new Hono<{ Bindings: AppEnv['Bindings'] }>();

// Global CORS middleware
app.use('/api/*', (c, next) => {
  const rawOrigins = c.env?.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
  const allowedOrigins = typeof rawOrigins === 'string'
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [rawOrigins];

  return cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || allowedOrigins[0];
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-User-Role',
      'X-Idempotency-Key',
    ],
    exposeHeaders: ['Content-Length', 'X-Total-Count', 'X-Correlation-ID'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// Mount microservices under /api/v1
app.route('/api/v1', quizApp);
// Temporarily disabled for debugging

// Health & info endpoints (at root level, not under /api/v1)
app.get('/health', (c) => {
  return c.json(createHealthHandler(c.env, startupTime));
});

// TEMPORARY DB diagnostic route
app.get('/health/db', async (c) => {
  const db = await createDrizzleClient(c.env as any);
  try {
    const result = await db.execute(`SELECT 1`);
    return c.json({
      connected: true,
      result,
    }, 200);
  } catch (err: any) {
    return c.json({
      connected: false,
      code: err?.cause?.code || err?.code,
      errno: err?.cause?.errno || err?.errno,
      sqlMessage: err?.cause?.sqlMessage || err?.sqlMessage,
      message: err?.cause?.message || err?.message || String(err),
      targetDatabase: 'u427015050_drizzle',
    }, 500);
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db));
  }
});

app.get('/', (c) => {
  return c.json({
    service: 'Scalable Quiz Platform Production API',
    version: c.env?.API_VERSION || 'v1',
    runtime: 'Cloudflare Workers (Hono) + Hostinger MySQL 8.0 (Drizzle)',
    docs: '/api/v1/openapi.json',
    health: '/health',
    dbHealth: '/api/v1/db-health',
    bindings: {
      kv: !!c.env?.CACHE_KV,
      hyperdrive: !!c.env?.HYPERDRIVE,
      r2: !!c.env?.ASSETS_R2,
    },
    services: [
      'catalog & quizzes (/api/v1/categories, /api/v1/exams, /api/v1/quizzes)',
      'attempts (/api/v1/quizzes/:id/start, /api/v1/attempts)',
      'payments (/api/v1/orders, /api/v1/payments)',
      'analytics (/api/v1/leaderboards, /api/v1/badges)',
    ],
  });
});

// Database PoC & Connectivity Probes
app.get('/poc/db-check', (c) => {
  return handlePocCheck({ env: c.env, req: c.req.raw, json: c.json.bind(c), executionCtx: c.executionCtx });
});

app.get('/api/v1/db-health', async (c) => {
  const db = await createDrizzleClient(c.env as any);
  try {
    const probe = await verifyDatabaseConnection(db);
    return c.json({
      connected: probe.ok,
      latencyMs: probe.latencyMs,
      targetDatabase: 'u427015050_quiz',
      error: probe.error,
    }, probe.ok ? 200 : 500);
  } catch (err) {
    return c.json({
      connected: false,
      error: 'Drizzle client is not initialized. Please verify DATABASE_URL or HYPERDRIVE binding.',
      targetDatabase: 'u427015050_quiz',
    }, 500);
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db));
  }
});

// OpenAPI Specification
app.get('/api/v1/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.3',
    info: {
      title: 'Quiz Platform Production API Gateway',
      version: '1.0.0',
      description: 'Cloudflare Workers Hono + Hostinger MySQL Microservices API',
    },
    paths: {
      '/health': { get: { summary: 'System Health Check' } },
      '/api/v1/db-health': { get: { summary: 'Database Ping and Latency Probe' } },
      '/api/v1/categories': { get: { summary: 'List categories' }, post: { summary: 'Create category (Strict MySQL)' } },
      '/api/v1/exams': { get: { summary: 'List exams' }, post: { summary: 'Create exam (Strict MySQL)' } },
      '/api/v1/quizzes': { get: { summary: 'List quizzes' }, post: { summary: 'Create quiz (Strict MySQL)' } },
      '/api/v1/questions': { get: { summary: 'List questions' }, post: { summary: 'Create question (Strict MySQL)' } },
      '/api/v1/quizzes/{id}/start': { post: { summary: 'Start timed quiz attempt' } },
      '/api/v1/attempts/{id}/answers': { post: { summary: 'Record candidate answer' } },
      '/api/v1/attempts/{id}/submit': { post: { summary: 'Authoritative scoring & leaderboard update' } },
      '/api/v1/orders': { post: { summary: 'Create paid quiz order' } },
      '/api/v1/payments/verify': { post: { summary: 'Verify payment and grant QuizAccess' } },
      '/api/v1/sync/attempts': { post: { summary: 'Offline attempt synchronization from SQLite' } },
      '/api/v1/leaderboards/{id}': { get: { summary: 'Get quiz leaderboard' } },
    },
  });
});

// Other services still use custom handle() pattern - they need similar refactoring
// For now, keep manual dispatch for services not yet converted to app.route()
app.all('/api/v1/auth/*', async (c) => {
  const res = await authService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    token: c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '',
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/devices/*', async (c) => {
  const res = await authService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    token: c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '',
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/attempts/*', async (c) => {
  const res = await attemptService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '', // TODO: extract from auth
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/bookmarks/*', async (c) => {
  const res = await attemptService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/saved-quizzes/*', async (c) => {
  const res = await attemptService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/sync/*', async (c) => {
  const res = await attemptService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/quizzes/*/start', async (c) => {
  const res = await attemptService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/orders/*', async (c) => {
  const res = await paymentService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/payments/*', async (c) => {
  const res = await paymentService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/webhooks/*', async (c) => {
  const res = await paymentService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/quiz-access/*', async (c) => {
  const res = await paymentService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/leaderboards/*', async (c) => {
  const res = await analyticsService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

app.all('/api/v1/badges/*', async (c) => {
  const res = await analyticsService.handle({
    path: c.req.path.replace('/api/v1', ''),
    method: c.req.method,
    body: await c.req.json().catch(() => ({})),
    correlationId: c.req.header('X-Correlation-ID') || `corr_${Date.now()}`,
    userId: '',
    env: c.env,
  });
  return c.json(res.data, res.status);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint Not Found', path: c.req.path, method: c.req.method }, 404);
});

export default app;