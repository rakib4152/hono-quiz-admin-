/**
 * Cloudflare Worker Entry Point: Hono v4 Application
 * API Base: /api/v1
 */

import { AppEnv } from './env.js';
import { createHealthHandler } from './routes/health.js';
import { handlePocCheck } from './routes/poc.js';

const startupTime = Date.now();

/**
 * Worker handler router for Cloudflare Workers
 */
export default {
  async fetch(request: Request, env: AppEnv['Bindings'], ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Standard headers
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': env.CORS_ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Helper JSON response
    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Powered-By': 'Hono/Workers',
          ...corsHeaders,
        },
      });
    };

    // Route matching for /api/v1
    if (path === '/' || path === '/api' || path === '/api/v1') {
      return jsonResponse({
        service: 'Scalable Quiz Platform API',
        version: '1.0.0-phase1',
        status: 'online',
        runtime: 'Cloudflare Workers (Edge)',
        endpoints: {
          health: '/api/v1/health',
          pocCheck: '/api/v1/poc/db-check',
          openapi: '/api/v1/openapi.json',
        },
      });
    }

    if (path === '/api/v1/health') {
      const healthData = createHealthHandler(env, startupTime);
      return jsonResponse(healthData);
    }

    if (path === '/api/v1/poc/db-check') {
      return handlePocCheck({
        env,
        req: request,
        json: jsonResponse,
      });
    }

    if (path === '/api/v1/openapi.json') {
      return jsonResponse({
        openapi: '3.0.3',
        info: {
          title: 'Quiz Platform Production API',
          version: '1.0.0',
          description: 'High-concurrency Quiz Platform running on Cloudflare Workers + Hono + Prisma + Hostinger MySQL.',
        },
        paths: {
          '/api/v1/health': {
            get: {
              summary: 'Service health check',
              responses: { '200': { description: 'Health status' } },
            },
          },
          '/api/v1/poc/db-check': {
            get: {
              summary: 'Phase 1 Database and Hyperdrive connectivity probe',
              responses: { '200': { description: 'Connection diagnostic report' } },
            },
          },
        },
      });
    }

    return jsonResponse({ error: 'Endpoint Not Found', path }, 404);
  },
};
