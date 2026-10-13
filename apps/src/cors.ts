import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

/**
 * Dynamic Hono CORS Middleware
 * Resolves comma-separated CORS_ALLOWED_ORIGINS from Worker bindings (c.env.CORS_ALLOWED_ORIGINS)
 * and matches the incoming request origin dynamically, returning ONLY a single matching origin header.
 * This completely eliminates the browser error:
 * "The 'Access-Control-Allow-Origin' header contains multiple values '...', but only one is allowed."
 */
export function createDynamicCorsMiddleware(defaultOrigin = 'http://localhost:3000'): MiddlewareHandler {
  return async (c, next) => {
    const rawOrigins = (c.env as any)?.CORS_ALLOWED_ORIGINS || defaultOrigin;
    const allowedOrigins = typeof rawOrigins === 'string'
      ? rawOrigins.split(',').map((o: string) => o.trim()).filter(Boolean)
      : Array.isArray(rawOrigins)
      ? rawOrigins
      : [defaultOrigin];

    const corsMiddleware = cors({
      origin: (origin) => {
        // Server-to-server or curl calls (no Origin header)
        if (!origin) {
          return allowedOrigins[0] || defaultOrigin;
        }
        // Exact match in allowed origins list
        if (allowedOrigins.includes(origin)) {
          return origin;
        }
        // Dev convenience: allow localhost / 127.0.0.1 on any port in development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return origin;
        }
        // Origin not allowed
        return null;
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
    });

    return corsMiddleware(c, next);
  };
}

/**
 * Pure helper function for worker fetch handlers and custom routers.
 * Ensures the 'Access-Control-Allow-Origin' header ALWAYS contains a single origin value,
 * never a comma-separated list of multiple origins.
 */
export function resolveSingleAllowedOrigin(
  incomingOrigin: string | null | undefined,
  rawAllowedOrigins?: string | string[],
  defaultOrigin = 'http://localhost:3000'
): string {
  const allowed = (
    typeof rawAllowedOrigins === 'string'
      ? rawAllowedOrigins.split(',').map((o) => o.trim())
      : Array.isArray(rawAllowedOrigins)
      ? rawAllowedOrigins
      : [defaultOrigin]
  ).filter(Boolean);

  if (incomingOrigin && allowed.includes(incomingOrigin)) {
    return incomingOrigin;
  }
  if (incomingOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(incomingOrigin)) {
    return incomingOrigin;
  }
  return allowed[0] || defaultOrigin;
}
