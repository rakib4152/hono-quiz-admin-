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

import { authService } from '../../services/auth-service/src/index.js';
import { quizService } from '../../services/quiz-service/src/index.js';
import { attemptService } from '../../services/attempt-service/src/index.js';
import { paymentService } from '../../services/payment-service/src/index.js';
import { analyticsService } from '../../services/analytics-service/src/index.js';
import {
  getPrismaClient,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
} from '../../packages/database/src/index.js';

export {
  getPrismaClient,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
};

const startupTime = Date.now();

/**
 * Hono Application Instance with Dynamic CORS Configuration
 */
export const app = new Hono<{ Bindings: AppEnv['Bindings'] }>();

app.use('/api/*', (c, next) => {
  const rawOrigins = c.env?.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
  const allowedOrigins = typeof rawOrigins === 'string'
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [rawOrigins];

  return cors({
    origin: (origin) => {
      // Dynamic single origin check: returns exactly one origin, never comma-joined
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
      'X-Correlation-ID',
      'X-User-Role',
      'X-Idempotency-Key',
    ],
    exposeHeaders: ['Content-Length', 'X-Total-Count', 'X-Correlation-ID'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

export default {
  async fetch(request: Request, env: AppEnv['Bindings'], ctx: any): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;
    const method = request.method;
    const searchParams = url.searchParams;

    // Normalizing API path prefix
    if (path.startsWith('/api/v1')) {
      path = path.slice('/api/v1'.length);
    } else if (path.startsWith('/api')) {
      path = path.slice('/api'.length);
    }
    if (!path.startsWith('/')) path = '/' + path;

    // Dynamic single-origin matching to prevent browser multiple-value CORS header errors
    const origin = request.headers.get('Origin') || '';
    const rawOrigins = env?.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
    const allowedOrigins = typeof rawOrigins === 'string'
      ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
      : [rawOrigins];

    let matchedOrigin: string | null = null;
    if (origin && allowedOrigins.includes(origin)) {
      matchedOrigin = origin;
    } else if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      matchedOrigin = origin;
    } else if (!origin) {
      matchedOrigin = allowedOrigins[0] || 'http://localhost:3000';
    } else {
      matchedOrigin = allowedOrigins[0] || null;
    }

    const corsHeaders: Record<string, string> = {
      ...(matchedOrigin ? { 'Access-Control-Allow-Origin': matchedOrigin } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Correlation-ID, X-User-Role, X-Idempotency-Key',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };

    // 1. Immediate CORS preflight response
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const correlationId =
      request.headers.get('X-Correlation-ID') ||
      request.headers.get('X-Request-ID') ||
      `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const json = (data: any, status = 200) => {
      return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Powered-By': 'Cloudflare-Workers-Hono',
          'X-Correlation-ID': correlationId,
          ...corsHeaders,
        },
      });
    };

    // 2. Parse request body if present
    let body: any = null;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    // 3. Resolve Prisma Client for Hostinger MySQL (u427015050_quiz) via Hyperdrive or DATABASE_URL
    let prisma: any = undefined;
    const dbUrl = resolveDatabaseUrl(env as any);
    if (dbUrl) {
      try {
        prisma = getPrismaClient(dbUrl);
      } catch (err) {
        console.error('[Worker Gateway] Failed to instantiate PrismaClient:', err);
      }
    }

    // 4. Token & user extraction from Authorization header
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let authenticatedUserId: string | undefined;
    let authenticatedUserRole: string | undefined;

    if (token) {
      const verifyRes = await authService.handle({
        path: '/internal/verify-token',
        method: 'POST',
        body: { token },
        correlationId,
      });
      if (verifyRes.data.valid && verifyRes.data.user) {
        authenticatedUserId = verifyRes.data.user.id;
        authenticatedUserRole = verifyRes.data.user.role;
      }
    }

    // 5. System Health Check
    if (path === '/health') {
      return json(createHealthHandler(env, startupTime));
    }

    // 6. Root Platform Information
    if (path === '/' || path === '') {
      return json({
        service: 'Scalable Quiz Platform Production API',
        version: env?.API_VERSION || 'v1',
        runtime: 'Cloudflare Workers (Hono) + Hostinger MySQL 8.0 (Prisma)',
        docs: '/api/v1/openapi.json',
        health: '/api/v1/health',
        dbHealth: '/api/v1/db-health',
        bindings: {
          kv: !!env?.CACHE_KV,
          hyperdrive: !!env?.HYPERDRIVE,
          r2: !!env?.ASSETS_R2,
        },
        services: [
          'auth (/api/v1/auth)',
          'catalog & quizzes (/api/v1/categories, /api/v1/exams, /api/v1/quizzes)',
          'attempts (/api/v1/quizzes/:id/start, /api/v1/attempts)',
          'payments (/api/v1/orders, /api/v1/payments)',
          'analytics (/api/v1/leaderboards, /api/v1/badges)',
        ],
      });
    }

    // 7. Database PoC & Connectivity Probes
    if (path === '/poc/db-check') {
      return handlePocCheck({ env, req: request, json });
    }

    if (path === '/db-health') {
      if (!prisma) {
        return json({
          connected: false,
          error: 'Prisma client is not initialized. Please verify DATABASE_URL or HYPERDRIVE binding.',
          targetDatabase: 'u427015050_quiz',
          correlationId,
        }, 500);
      }
      const probe = await verifyDatabaseConnection(prisma);
      return json({
        connected: probe.ok,
        latencyMs: probe.latencyMs,
        targetDatabase: 'u427015050_quiz',
        error: probe.error,
        correlationId,
      }, probe.ok ? 200 : 500);
    }

    // 8. OpenAPI Specification
    if (path === '/openapi.json') {
      return json({
        openapi: '3.0.3',
        info: {
          title: 'Quiz Platform Production API Gateway',
          version: '1.0.0',
          description: 'Cloudflare Workers Hono + Hostinger MySQL Microservices API',
        },
        paths: {
          '/api/v1/health': { get: { summary: 'System Health Check' } },
          '/api/v1/db-health': { get: { summary: 'Database Ping and Latency Probe' } },
          '/api/v1/auth/register': { post: { summary: 'Register User' } },
          '/api/v1/auth/login': { post: { summary: 'Login and issue session token' } },
          '/api/v1/auth/me': { get: { summary: 'Get current user profile' } },
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
    }

    // 9. Dispatch to Auth Service (User, Session, Device)
    if (path.startsWith('/auth') || path.startsWith('/devices')) {
      const res = await authService.handle({ path, method, body, token, correlationId });
      return json(res.data, res.status);
    }

    // 10. Dispatch to Quiz Content Service (Strict MySQL with Prisma)
    if (
      path.startsWith('/categories') ||
      path.startsWith('/exams') ||
      path.startsWith('/subjects') ||
      path.startsWith('/topics') ||
      path.startsWith('/questions') ||
      path === '/internal/quiz-scoring-keys' ||
      (path.startsWith('/quizzes') && !path.includes('/attempts') && !path.includes('/start'))
    ) {
      const res = await quizService.handle({
        path,
        method,
        body,
        query: searchParams,
        correlationId,
        userRole: authenticatedUserRole,
        prisma,
      });
      return json(res.data, res.status);
    }

    // 11. Dispatch to Attempt Service (Attempts, Scoring, Offline Sync, Bookmarks)
    if (
      path.includes('/attempts') ||
      path.includes('/bookmarks') ||
      path.includes('/saved-quizzes') ||
      path.startsWith('/sync') ||
      (path.startsWith('/quizzes/') && path.endsWith('/start'))
    ) {
      const res = await attemptService.handle({
        path,
        method,
        body,
        correlationId,
        userId: authenticatedUserId,
      });
      return json(res.data, res.status);
    }

    // 12. Dispatch to Payment Service (Orders, Payments, Webhooks, QuizAccess)
    if (
      path.startsWith('/orders') ||
      path.startsWith('/payments') ||
      path.startsWith('/webhooks') ||
      path.includes('/quiz-access')
    ) {
      const res = await paymentService.handle({
        path,
        method,
        body,
        correlationId,
        userId: authenticatedUserId,
      });
      return json(res.data, res.status);
    }

    // 13. Dispatch to Analytics Service (Leaderboards, Badges)
    if (path.startsWith('/leaderboards') || path.startsWith('/badges')) {
      const res = await analyticsService.handle({
        path,
        method,
        body,
        correlationId,
        userId: authenticatedUserId,
      });
      return json(res.data, res.status);
    }

    return json({ error: 'Endpoint Not Found', path: `/api/v1${path}`, method }, 404);
  },
};
