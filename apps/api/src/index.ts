/**
 * Cloudflare Workers Hono Application Entry Point
 * Base Route: /api/v1
 * Models: User, Session, Device, Category, Exam, Subject, Topic, Quiz, Question,
 *         Option, QuizQuestion, QuizAttempt, AttemptAnswer, Order, Payment,
 *         QuizAccess, Bookmark, SavedQuiz, Badge, UserBadge, LeaderboardEntry, OfflineSync
 */

import { AppEnv } from './env.js';
import { createHealthHandler } from './routes/health.js';
import { handlePocCheck } from './routes/poc.js';

import { handleAuthRoutes } from './modules/auth/router.js';
import { handleCatalogRoutes } from './modules/catalog/router.js';
import { handleQuizRoutes } from './modules/quizzes/router.js';
import { handleQuestionRoutes } from './modules/questions/router.js';
import { handleAttemptRoutes } from './modules/attempts/router.js';
import { handlePaymentRoutes } from './modules/payments/router.js';
import { handleUserFeaturesRoutes } from './modules/user-features/router.js';

const startupTime = Date.now();

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

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': env?.CORS_ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Idempotency-Key',
      'Access-Control-Max-Age': '86400',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (data: any, status = 200) => {
      return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Powered-By': 'Hono/Workers/Prisma',
          ...corsHeaders,
        },
      });
    };

    // Parse body for JSON requests
    let body: any = null;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    // Health
    if (path === '/health') {
      return json(createHealthHandler(env, startupTime));
    }

    // Root info
    if (path === '/' || path === '') {
      return json({
        service: 'Scalable Quiz Platform Production API',
        version: '1.0.0',
        runtime: 'Cloudflare Workers (Hono) + Hostinger MySQL 8.0 (Prisma)',
        docs: '/api/v1/openapi.json',
        modules: [
          'auth',
          'catalog',
          'quizzes',
          'questions',
          'attempts',
          'payments',
          'bookmarks',
          'offline-sync',
          'leaderboards',
        ],
      });
    }

    // Phase 1 PoC check
    if (path === '/poc/db-check') {
      return handlePocCheck({ env, req: request, json });
    }

    // OpenAPI Spec
    if (path === '/openapi.json') {
      return json({
        openapi: '3.0.3',
        info: {
          title: 'Quiz Platform Production API',
          version: '1.0.0',
          description: 'Hono + Prisma + Hostinger MySQL Quiz Platform API',
        },
        paths: {
          '/api/v1/auth/register': { post: { summary: 'Register User' } },
          '/api/v1/auth/login': { post: { summary: 'Login and issue session token' } },
          '/api/v1/auth/me': { get: { summary: 'Get current user profile' } },
          '/api/v1/categories': { get: { summary: 'List categories' }, post: { summary: 'Create category' } },
          '/api/v1/exams': { get: { summary: 'List exams' }, post: { summary: 'Create exam' } },
          '/api/v1/subjects': { get: { summary: 'List subjects' } },
          '/api/v1/quizzes': { get: { summary: 'List quizzes' }, post: { summary: 'Create quiz' } },
          '/api/v1/quizzes/{id}/start': { post: { summary: 'Start timed quiz attempt' } },
          '/api/v1/attempts/{id}/answers': { post: { summary: 'Record candidate answer' } },
          '/api/v1/attempts/{id}/submit': { post: { summary: 'Authoritative scoring & leaderboard update' } },
          '/api/v1/orders': { post: { summary: 'Create paid quiz order' } },
          '/api/v1/payments/verify': { post: { summary: 'Verify payment and grant QuizAccess' } },
          '/api/v1/sync/attempts': { post: { summary: 'Offline attempt synchronization from SQLite' } },
        },
      });
    }

    // 1. Auth Module (User, Session, Device)
    const authResult = handleAuthRoutes(path, method, body, request.headers);
    if (authResult) return json(authResult.data, authResult.status);

    // 2. Catalog Module (Category, Exam, Subject, Topic)
    const catalogResult = handleCatalogRoutes(path, method, body);
    if (catalogResult) return json(catalogResult.data, catalogResult.status);

    // 3. Quiz Module (Quiz, QuizQuestion)
    const quizResult = handleQuizRoutes(path, method, body, searchParams, request.headers);
    if (quizResult) return json(quizResult.data, quizResult.status);

    // 4. Questions Module (Question, Option)
    const questionResult = handleQuestionRoutes(path, method, body, searchParams);
    if (questionResult) return json(questionResult.data, questionResult.status);

    // 5. Attempts Module (QuizAttempt, AttemptAnswer)
    const attemptResult = handleAttemptRoutes(path, method, body, request.headers);
    if (attemptResult) return json(attemptResult.data, attemptResult.status);

    // 6. Payments Module (Order, Payment, QuizAccess)
    const paymentResult = handlePaymentRoutes(path, method, body, searchParams, request.headers);
    if (paymentResult) return json(paymentResult.data, paymentResult.status);

    // 7. User Features & Gamification (Bookmark, SavedQuiz, LeaderboardEntry, Badge, OfflineSync)
    const userFeatureResult = handleUserFeaturesRoutes(path, method, body, searchParams, request.headers);
    if (userFeatureResult) return json(userFeatureResult.data, userFeatureResult.status);

    return json({ error: 'Endpoint Not Found', path: `/api/v1${path}`, method }, 404);
  },
};
