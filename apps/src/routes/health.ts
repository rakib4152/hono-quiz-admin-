/**
 * Health Check Route Handler
 * Evaluates Cloudflare Worker bindings (CACHE_KV, HYPERDRIVE, ASSETS_R2) and system uptime
 */

import { AppEnv } from '../env.js';

export function createHealthHandler(env: AppEnv['Bindings'], startupTime: number) {
  const uptimeSeconds = Math.floor((Date.now() - startupTime) / 1000);

  return {
    ok: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    service: 'quiz-platform-api',
    runtime: env?.HYPERDRIVE ? 'Cloudflare Workers (Edge)' : 'Node.js (@hono/node-server)',
    bindings: {
      hyperdrive: !!env?.HYPERDRIVE,
      kvCache: !!env?.CACHE_KV,
      r2Assets: !!env?.ASSETS_R2,
      databaseUrlConfigured: !!(
        env?.DATABASE_URL ||
        env?.QUIZ_DATABASE_URL ||
        (typeof process !== 'undefined' && process.env?.DATABASE_URL)
      ),
    },
    version: env?.API_VERSION || 'v1',
    environment:
      env?.ENVIRONMENT ||
      (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) ||
      'development',
  };
}
