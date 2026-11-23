/**
 * Cloudflare Workers Hono Application Entry Point
 * Base Route: /api/v1
 * Microservices Architecture:
 * - Auth Service: users & active devices (JWT + Clerk)
 * - Quiz Service: categories, exams, subjects, topics, quizzes, questions, options, quiz_questions
 * - Attempt Service: attempts, attempt_answers, bookmarks, saved_quizzes, offline sync
 * - Payment Service: orders, payments, quiz_access
 * - Analytics Service: leaderboards, badges
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppEnv } from './env.js';
import { createHealthHandler } from './routes/health.js';
import { handlePocCheck } from './routes/poc.js';

import quizApp from '@quiz-service';
import { attemptService } from '@attempt-service';
import { paymentService } from '@payment-service';
import { analyticsService } from '@analytics-service';
import { authApp, resolveAuthenticatedUser } from '@auth-service';

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

function getExecutionCtx(c: any): { waitUntil: (p: Promise<any>) => void } | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}

async function cleanupDb(db: DrizzleDB, c: any): Promise<void> {
  const ctx = getExecutionCtx(c);
  const cleanup = endDrizzleConnection(db);
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(cleanup);
  } else {
    await cleanup;
  }
}

// Global CORS middleware for API and auth routes
app.use('*', (c, next) => {
  const rawOrigins =
    c.env?.CORS_ALLOWED_ORIGINS ||
    'https://jobexambd.com,https://www.jobexambd.com,https://admin.jobexambd.com,https://api.jobexambd.com,http://localhost:3000';
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
      if (/^https:\/\/[a-z0-9-]+\.(asia-east1\.run\.app|pages\.dev|hostingersite\.com)$/.test(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Clerk-User-Id',
      'X-Correlation-ID',
      'X-Requested-With',
      'X-Request-ID',
      'X-User-Role',
      'X-Idempotency-Key',
      'X-Internal-Service-Key',
    ],
    exposeHeaders: ['Content-Length', 'X-Total-Count', 'X-Correlation-ID'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// Mount native Hono microservices under /api/v1 (and /auth/*, /devices/* at root)
app.route('/api/v1', quizApp);
app.route('/api/v1', authApp);
app.route('/', authApp);

// Health & info endpoints (available at both root and /api/v1)
app.get('/health', (c) => {
  return c.json(createHealthHandler(c.env, startupTime));
});

app.get('/api/v1/health', (c) => {
  return c.json(createHealthHandler(c.env, startupTime));
});

// DB diagnostic routes
const handleRawDbCheck = async (c: any) => {
  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(c.env as any);
    const result = await db.execute(`SELECT 1`);
    return c.json({
      connected: true,
      database: 'u427015050_drizzle',
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
    if (db) {
      await cleanupDb(db, c);
    }
  }
};

app.get('/health/db', handleRawDbCheck);
app.get('/api/v1/health/db', handleRawDbCheck);

const buildApiMetadata = (c: any) => ({
  service: 'Scalable Quiz Platform Production API',
  domain: 'api.jobexambd.com',
  version: c.env?.API_VERSION || 'v1',
  runtime: 'Cloudflare Workers (Hono) + Hostinger MySQL 8.0 (Drizzle)',
  docs: '/api/v1/openapi.json',
  health: '/api/v1/health',
  dbHealth: '/api/v1/db-health',
  authSync: '/api/v1/auth/clerk-sync',
  bindings: {
    kv: !!c.env?.CACHE_KV,
    hyperdrive: !!c.env?.HYPERDRIVE,
    r2: !!c.env?.ASSETS_R2,
    assets: !!c.env?.ASSETS,
  },
  services: [
    'auth & devices (/api/v1/auth/register, /api/v1/auth/login, /api/v1/auth/clerk-sync, /api/v1/auth/me, /api/v1/devices)',
    'catalog & quizzes (/api/v1/categories, /api/v1/exams, /api/v1/subjects, /api/v1/topics, /api/v1/quizzes, /api/v1/questions)',
    'attempts & sync (/api/v1/quizzes/:id/start, /api/v1/attempts/:id, /api/v1/attempts/:id/answers, /api/v1/attempts/:id/submit, /api/v1/sync/attempts)',
    'bookmarks & saved (/api/v1/bookmarks, /api/v1/bookmarks/toggle, /api/v1/saved-quizzes/toggle)',
    'payments & access (/api/v1/orders, /api/v1/payments/verify, /api/v1/quiz-access/:quizId)',
    'analytics (/api/v1/leaderboards/:quizId, /api/v1/badges, /api/v1/badges/my)',
  ],
});

app.get('/api/v1', (c) => {
  return c.json(buildApiMetadata(c));
});

app.get('/', async (c) => {
  if (c.env?.ASSETS && typeof c.env.ASSETS.fetch === 'function') {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.json(buildApiMetadata(c));
});

// Database PoC & Connectivity Probes
app.get('/poc/db-check', (c) => {
  return handlePocCheck({
    env: c.env,
    req: c.req.raw,
    json: c.json.bind(c),
    executionCtx: getExecutionCtx(c),
  });
});

app.get('/api/v1/poc/db-check', (c) => {
  return handlePocCheck({
    env: c.env,
    req: c.req.raw,
    json: c.json.bind(c),
    executionCtx: getExecutionCtx(c),
  });
});

const handleDbHealth = async (c: any) => {
  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(c.env as any);
    const probe = await verifyDatabaseConnection(db);
    return c.json({
      connected: probe.ok,
      latencyMs: probe.latencyMs,
      targetDatabase: 'u427015050_drizzle',
      error: probe.error,
    }, probe.ok ? 200 : 500);
  } catch (err: any) {
    return c.json({
      connected: false,
      error: err?.cause?.message || err?.message || 'Drizzle client failed to connect. Verify DATABASE_URL or HYPERDRIVE binding.',
      targetDatabase: 'u427015050_drizzle',
    }, 500);
  } finally {
    if (db) {
      await cleanupDb(db, c);
    }
  }
};

app.get('/api/v1/db-health', handleDbHealth);
app.get('/db-health', handleDbHealth);

// Complete OpenAPI 3.0.3 Specification covering all 36 endpoints
app.get('/api/v1/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.3',
    info: {
      title: 'Quiz Platform Production API Gateway',
      version: '1.1.0',
      description: 'Cloudflare Workers Hono + Hostinger MySQL (Drizzle ORM) Microservices API',
    },
    paths: {
      '/health': { get: { summary: 'Gateway Health Check' } },
      '/api/v1/health': { get: { summary: 'API v1 Health Check' } },
      '/api/v1/db-health': { get: { summary: 'Hostinger MySQL Database Health & Ping' } },
      '/api/v1/poc/db-check': { get: { summary: 'Database PoC Connectivity Probe' } },
      '/api/v1/openapi.json': { get: { summary: 'OpenAPI Specification' } },
      '/api/v1/categories': { get: { summary: 'List All Categories' }, post: { summary: 'Create Category' } },
      '/api/v1/categories/{id}': {
        get: { summary: 'Get Category by ID' },
        put: { summary: 'Update Category' },
        delete: { summary: 'Delete Category' },
      },
      '/api/v1/exams': { get: { summary: 'List All Exams' }, post: { summary: 'Create Exam' } },
      '/api/v1/exams/{id}': { get: { summary: 'Get Exam by ID' }, delete: { summary: 'Delete Exam' } },
      '/api/v1/subjects': { get: { summary: 'List Subjects' }, post: { summary: 'Create Subject' } },
      '/api/v1/topics': { get: { summary: 'List Topics' }, post: { summary: 'Create Topic' } },
      '/api/v1/quizzes': { get: { summary: 'List All Quizzes' }, post: { summary: 'Create Quiz' } },
      '/api/v1/quizzes/{id}': {
        get: { summary: 'Get Quiz Details by ID' },
        put: { summary: 'Update Quiz' },
        delete: { summary: 'Delete Quiz' },
      },
      '/api/v1/quizzes/{id}/questions': { post: { summary: 'Link Question to Quiz' } },
      '/api/v1/quizzes/{id}/offline-package': { get: { summary: 'Get Offline Quiz Package' } },
      '/api/v1/questions': { get: { summary: 'List All Questions' }, post: { summary: 'Create Question with Options (Atomic)' } },
      '/api/v1/questions/{id}': { delete: { summary: 'Delete Question' } },
      '/api/v1/quizzes/{id}/start': { post: { summary: 'Start Quiz Attempt' } },
      '/api/v1/attempts/{id}': { get: { summary: 'Get Attempt Summary' } },
      '/api/v1/attempts/{id}/answers': { post: { summary: 'Save Candidate Answer' } },
      '/api/v1/attempts/{id}/submit': { post: { summary: 'Submit Attempt for Authoritative Scoring' } },
      '/api/v1/sync/attempts': { post: { summary: 'Sync Offline Attempts Batch' } },
      '/api/v1/bookmarks': { get: { summary: 'List User Bookmarks' } },
      '/api/v1/bookmarks/toggle': { post: { summary: 'Toggle Bookmark on Question' } },
      '/api/v1/saved-quizzes': { get: { summary: 'List Saved Quizzes' } },
      '/api/v1/saved-quizzes/toggle': { post: { summary: 'Save Quiz for Later' } },
      '/api/v1/auth/register': { post: { summary: 'Register User' } },
      '/api/v1/auth/login': { post: { summary: 'Login' } },
      '/api/v1/auth/clerk-sync': { post: { summary: 'Synchronize Clerk User Profile' } },
      '/api/v1/auth/me': { get: { summary: 'Get Current User Profile' } },
      '/api/v1/devices': { get: { summary: 'List Active Devices' } },
      '/api/v1/devices/register': { post: { summary: 'Register Active Device' } },
      '/api/v1/orders': { get: { summary: 'List Orders' }, post: { summary: 'Create Paid Quiz Order' } },
      '/api/v1/payments/verify': { post: { summary: 'Verify Payment & Unlock Access' } },
      '/api/v1/quiz-access/{quizId}': { get: { summary: 'Check Quiz Access Status' } },
      '/api/v1/leaderboards/{quizId}': { get: { summary: 'Get Quiz Leaderboard' } },
      '/api/v1/badges': { get: { summary: 'List All Badges' } },
      '/api/v1/badges/my': { get: { summary: 'Get User Earned Badges' } },
      '/api/v1/internal/quiz-scoring-keys': { post: { summary: 'Fetch Quiz Authoritative Scoring Keys' } },
    },
  });
});

// Helper to resolve verified authenticated user from Bearer token (JWT or Clerk)
async function resolveRequestAuth(c: any) {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  if (!token) {
    return { token: '', userId: '', userRole: undefined, correlationId };
  }
  const user = await resolveAuthenticatedUser({
    token,
    env: c.env,
    executionCtx: getExecutionCtx(c),
  });
  return {
    token,
    userId: user?.id || '',
    userRole: user?.role,
    correlationId,
  };
}

function normalizeServicePath(rawPath: string): string {
  return rawPath.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
}

async function parseJsonBody(c: any) {
  if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'DELETE') {
    return undefined;
  }
  return c.req.json().catch(() => ({}));
}

// ============================================================================
// ATTEMPT, OFFLINE SYNC, BOOKMARKS & SAVED QUIZZES ROUTES
// ============================================================================
const forwardToAttemptService = async (c: any) => {
  const { userId, userRole, correlationId } = await resolveRequestAuth(c);
  const res = await attemptService.handle({
    path: normalizeServicePath(c.req.path),
    method: c.req.method,
    body: await parseJsonBody(c),
    correlationId,
    userId,
    userRole,
    env: c.env,
  });
  return c.json(res.data, res.status as any);
};

app.all('/api/v1/quizzes/:id/start', forwardToAttemptService);
app.all('/api/v1/quizzes/:id/attempts', forwardToAttemptService);
app.all('/api/v1/attempts', forwardToAttemptService);
app.all('/api/v1/attempts/*', forwardToAttemptService);
app.all('/api/v1/bookmarks', forwardToAttemptService);
app.all('/api/v1/bookmarks/*', forwardToAttemptService);
app.all('/api/v1/saved-quizzes', forwardToAttemptService);
app.all('/api/v1/saved-quizzes/*', forwardToAttemptService);
app.all('/api/v1/sync/*', forwardToAttemptService);

// ============================================================================
// PAYMENTS, ORDERS & QUIZ ACCESS ROUTES
// ============================================================================
const forwardToPaymentService = async (c: any) => {
  const { userId, userRole, correlationId } = await resolveRequestAuth(c);
  const res = await paymentService.handle({
    path: normalizeServicePath(c.req.path),
    method: c.req.method,
    body: await parseJsonBody(c),
    correlationId,
    userId,
    userRole,
    env: c.env,
  });
  return c.json(res.data, res.status as any);
};

app.all('/api/v1/orders', forwardToPaymentService);
app.all('/api/v1/orders/*', forwardToPaymentService);
app.all('/api/v1/payments', forwardToPaymentService);
app.all('/api/v1/payments/*', forwardToPaymentService);
app.all('/api/v1/webhooks/*', forwardToPaymentService);
app.all('/api/v1/quiz-access', forwardToPaymentService);
app.all('/api/v1/quiz-access/*', forwardToPaymentService);
app.all('/api/v1/users/me/quiz-access', forwardToPaymentService);

// ============================================================================
// ANALYTICS, LEADERBOARDS & BADGES ROUTES
// ============================================================================
const forwardToAnalyticsService = async (c: any) => {
  const { userId, correlationId } = await resolveRequestAuth(c);
  const res = await analyticsService.handle({
    path: normalizeServicePath(c.req.path),
    method: c.req.method,
    body: await parseJsonBody(c),
    correlationId,
    userId,
    env: c.env,
  });
  return c.json(res.data, res.status as any);
};

app.all('/api/v1/leaderboards', forwardToAnalyticsService);
app.all('/api/v1/leaderboards/*', forwardToAnalyticsService);
app.all('/api/v1/badges', forwardToAnalyticsService);
app.all('/api/v1/badges/*', forwardToAnalyticsService);
app.all('/api/v1/users/me/badges', forwardToAnalyticsService);

// 404 handler (falls back to static SPA index.html for non-API GET requests when ASSETS is bound)
app.notFound(async (c) => {
  const isApiPath =
    c.req.path.startsWith('/api/') ||
    c.req.path === '/api' ||
    c.req.path.startsWith('/auth/') ||
    c.req.path.startsWith('/health') ||
    c.req.path.startsWith('/db-health') ||
    c.req.path.startsWith('/poc/') ||
    c.req.path.startsWith('/devices') ||
    c.req.path.startsWith('/internal/');

  if (!isApiPath && c.req.method === 'GET' && c.env?.ASSETS && typeof c.env.ASSETS.fetch === 'function') {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.json({ error: 'Endpoint Not Found', path: c.req.path, method: c.req.method }, 404);
});

export default app;