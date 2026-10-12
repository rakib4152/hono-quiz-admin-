/**
 * @quiz/database
 * Shared Edge-Ready Database Utility for Cloudflare Workers, Wrangler & Node.js
 * 
 * Provides:
 * - Isolate-level singleton PrismaClient caching to prevent connection exhaustion
 * - Cloudflare Hyperdrive & DATABASE_URL resolution
 * - Driver adapter & Edge runtime compatibility for Hostinger MySQL (u427015050_quiz)
 * - Diagnostic connectivity probe for phpMyAdmin / remote MySQL debugging
 * - Re-exported Prisma types for cross-microservice usage
 */

import { PrismaClient } from '@prisma/client';

export interface DatabaseEnv {
  DATABASE_URL?: string;
  QUIZ_DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  [key: string]: any;
}

export interface DatabaseClientOptions {
  /** Explicit connection string or Hyperdrive pool URL */
  datasourceUrl?: string;
  /** Cloudflare Worker request environment bindings */
  env?: DatabaseEnv;
  /** Enable query logging during development */
  logQueries?: boolean;
}

/** Cache of initialized Prisma instances keyed by connection string */
const clientCache = new Map<string, PrismaClient>();

/** Default fallback singleton instance */
let globalClient: PrismaClient | null = null;

/**
 * Resolves the appropriate database connection string from environment bindings.
 * Prioritizes Cloudflare Hyperdrive connection pooling over direct connection strings.
 */
export function resolveDatabaseUrl(env?: DatabaseEnv): string {
  if (env?.HYPERDRIVE?.connectionString) {
    return env.HYPERDRIVE.connectionString;
  }
  if (env?.QUIZ_DATABASE_URL) {
    return env.QUIZ_DATABASE_URL;
  }
  if (env?.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return '';
}

/**
 * Retrieves or creates a singleton PrismaClient instance for the Cloudflare Worker isolate.
 * Reuses the active client across requests in the same isolate to prevent connection pooling exhaustion.
 *
 * @param options DatabaseClientOptions, connection string, or DatabaseEnv bindings
 * @returns Cached singleton PrismaClient
 */
export function getPrismaClient(
  options?: string | DatabaseClientOptions | DatabaseEnv
): PrismaClient {
  let datasourceUrl = '';
  let logQueries = false;

  if (typeof options === 'string') {
    datasourceUrl = options;
  } else if (options) {
    if ('DATABASE_URL' in options || 'HYPERDRIVE' in options || 'QUIZ_DATABASE_URL' in options) {
      datasourceUrl = resolveDatabaseUrl(options as DatabaseEnv);
    } else {
      const opts = options as DatabaseClientOptions;
      datasourceUrl = opts.datasourceUrl || resolveDatabaseUrl(opts.env);
      logQueries = !!opts.logQueries;
    }
  }

  // 1. If a specific datasource URL was resolved, cache and reuse by URL
  if (datasourceUrl) {
    const cached = clientCache.get(datasourceUrl);
    if (cached) {
      return cached;
    }

    try {
      const newClient = new PrismaClient({
        datasourceUrl,
        log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
      });
      clientCache.set(datasourceUrl, newClient);
      return newClient;
    } catch (err) {
      // In case of constructor error (e.g., binary engine in edge sandbox without adapter),
      // re-throw with actionable details
      console.error('[Prisma Init Error] Failed to initialize PrismaClient with datasourceUrl:', err);
      throw err;
    }
  }

  // 2. Fallback to global singleton if no URL was explicitly passed
  if (!globalClient) {
    globalClient = new PrismaClient({
      log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
    });
  }

  return globalClient;
}

/**
 * Runs an active diagnostic ping (SELECT 1) against the database to confirm
 * credentials, network routing, and MySQL responsiveness.
 */
export async function verifyDatabaseConnection(
  prisma: PrismaClient
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || String(err) };
  }
}

/**
 * Gracefully disconnects all cached Prisma clients (used during shutdown / tests).
 */
export async function disconnectAll(): Promise<void> {
  const disconnectPromises = Array.from(clientCache.values()).map((client) => client.$disconnect());
  if (globalClient) {
    disconnectPromises.push(globalClient.$disconnect());
  }
  await Promise.all(disconnectPromises);
  clientCache.clear();
  globalClient = null;
}

// Re-export PrismaClient for consumer services
export { PrismaClient };
