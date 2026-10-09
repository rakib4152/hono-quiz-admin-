/**
 * Microservice: API Gateway
 * Responsibilities:
 * - Versioned routing (/api/v1/*)
 * - Request IDs and Correlation IDs
 * - Service authentication and role extraction
 * - Inter-service request dispatching
 * - CORS and error standardization
 * - OpenAPI specification
 */

import { authService } from '../../auth-service/src/index.js';
import { quizService } from '../../quiz-service/src/index.js';
import { attemptService } from '../../attempt-service/src/index.js';
import { paymentService } from '../../payment-service/src/index.js';
import { analyticsService } from '../../analytics-service/src/index.js';

export const apiGateway = {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;
    const method = request.method;
    const searchParams = url.searchParams;

    const correlationId = request.headers.get('x-correlation-id') || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-ID, X-Idempotency-Key',
      'X-Correlation-ID': correlationId,
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (data: any, status = 200) => {
      return new Response(
        JSON.stringify({ ...data, correlationId, timestamp: new Date().toISOString() }, null, 2),
        {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Gateway-Architecture': 'Microservices-Hono-Workers',
            ...corsHeaders,
          },
        }
      );
    };

    // Normalize path prefix
    if (path.startsWith('/api/v1')) path = path.slice('/api/v1'.length);
    else if (path.startsWith('/api')) path = path.slice('/api'.length);
    if (!path.startsWith('/')) path = '/' + path;

    // Body parsing
    let body: any = null;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    // Auth extraction & validation
    const authHeader = request.headers.get('authorization') || '';
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

    // 0. Public Gateway Root & OpenAPI
    if (path === '/' || path === '') {
      return json({
        gateway: 'Scalable Paid Quiz Platform API Gateway',
        version: 'v1.0.0',
        architecture: 'Decoupled Microservices with Database-per-Service (Hostinger MySQL 8.0)',
        services: {
          auth: 'auth_db (User, Session, Device)',
          quiz: 'quiz_db (Category, Exam, Subject, Topic, Quiz, Question, Option, QuizQuestion)',
          attempt: 'attempt_db (QuizAttempt, AttemptAnswer, Bookmark, SavedQuiz, OfflineSync)',
          payment: 'payment_db (Order, Payment, QuizAccess)',
          analytics: 'analytics_db (Badge, UserBadge, LeaderboardEntry)',
        },
      });
    }

    if (path === '/openapi.json') {
      return json({
        openapi: '3.0.3',
        info: { title: 'Scalable Paid Quiz Platform Microservices API', version: '1.0.0' },
        servers: [{ url: '/api/v1' }],
      });
    }

    // 1. Route to Auth Service
    if (path.startsWith('/auth') || path.startsWith('/devices')) {
      const res = await authService.handle({ path, method, body, token, correlationId });
      return json(res.data, res.status);
    }

    // 2. Route to Quiz Content Service
    if (
      path.startsWith('/categories') ||
      path.startsWith('/exams') ||
      path.startsWith('/subjects') ||
      path.startsWith('/topics') ||
      path.startsWith('/questions') ||
      (path.startsWith('/quizzes') && !path.includes('/attempts'))
    ) {
      const res = await quizService.handle({
        path,
        method,
        body,
        query: searchParams,
        correlationId,
        userRole: authenticatedUserRole,
      });
      return json(res.data, res.status);
    }

    // 3. Route to Attempt Service
    if (
      path.includes('/attempts') ||
      path.includes('/bookmarks') ||
      path.includes('/saved-quizzes') ||
      path.startsWith('/sync')
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

    // 4. Route to Payment Service
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

    // 5. Route to Analytics Service
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

    return json({ error: 'Route not mapped in API Gateway', path: `/api/v1${path}` }, 404);
  },
};
