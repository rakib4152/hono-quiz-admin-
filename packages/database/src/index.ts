/**
 * @quiz/database
 * Shared Edge-Ready Database Utility for Cloudflare Workers, Wrangler & Node.js
 * 
 * Provides:
 * - Prisma Driver Adapter using `mysql2/promise` (@prisma/adapter-mysql)
 * - Isolate-level dynamic PrismaClient caching to prevent connection exhaustion
 * - Cloudflare Hyperdrive & DATABASE_URL resolution
 * - Edge runtime compatibility for Hostinger MySQL (u427015050_quiz)
 * - Diagnostic connectivity probe for phpMyAdmin / remote MySQL debugging
 * - Re-exported Prisma types for cross-microservice usage
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMysql } from './adapter-mysql.js';
import mysql from 'mysql2/promise';

export { PrismaMysql };
export * from './adapter-mysql.js';
export { PrismaClient };

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

/** Cache of mysql2 connection pools keyed by connection string */
const poolCache = new Map<string, mysql.Pool>();

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
 * Creates a new PrismaClient with the MySQL2 driver adapter.
 * This adapter runs directly in Cloudflare Workers using TCP sockets (nodejs_compat).
 */
export function createPrismaClientWithAdapter(
  connectionString: string,
  logQueries = false
): PrismaClient {
  let pool = poolCache.get(connectionString);
  if (!pool) {
    pool = mysql.createPool(connectionString);
    poolCache.set(connectionString, pool);
  }

  const adapter = new PrismaMysql(pool);

  return new PrismaClient({
    adapter: adapter as any,
    log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
  });
}

/**
 * Retrieves or dynamically creates a PrismaClient instance for the Cloudflare Worker isolate.
 * Designed to be called dynamically inside request handlers using `c.env.HYPERDRIVE.connectionString`
 * or `c.env.DATABASE_URL`, reusing the active client per connection string in the worker isolate.
 *
 * @param options DatabaseClientOptions, connection string, or DatabaseEnv bindings
 * @returns Edge-compatible PrismaClient configured with mysql2 adapter
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

  // 1. If connection string was resolved, use driver adapter and cache in isolate
  if (datasourceUrl) {
    const cached = clientCache.get(datasourceUrl);
    if (cached) {
      return cached;
    }

    try {
      const client = createPrismaClientWithAdapter(datasourceUrl, logQueries);
      clientCache.set(datasourceUrl, client);
      return client;
    } catch (adapterErr) {
      console.warn('[Prisma Init] Driver adapter initialization warning, attempting direct client:', adapterErr);
      try {
        const fallbackClient = new PrismaClient({
          datasourceUrl,
          log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
        });
        clientCache.set(datasourceUrl, fallbackClient);
        return fallbackClient;
      } catch (err) {
        console.error('[Prisma Init Error] Failed to initialize PrismaClient:', err);
        throw err;
      }
    }
  }

  // 2. Fallback to singleton instance if no specific URL was resolved
  if (!globalClient) {
    const defaultUrl = resolveDatabaseUrl();
    if (defaultUrl) {
      globalClient = createPrismaClientWithAdapter(defaultUrl, logQueries);
    } else {
      globalClient = new PrismaClient({
        log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
      });
    }
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
 * Gracefully disconnects all cached Prisma clients and mysql2 pools.
 */
export async function disconnectAll(): Promise<void> {
  const disconnectPromises = Array.from(clientCache.values()).map((client) => client.$disconnect());
  if (globalClient) {
    disconnectPromises.push(globalClient.$disconnect());
  }
  await Promise.all(disconnectPromises);
  clientCache.clear();
  globalClient = null;

  const poolEndPromises = Array.from(poolCache.values()).map((pool) => pool.end());
  await Promise.all(poolEndPromises);
  poolCache.clear();
}
