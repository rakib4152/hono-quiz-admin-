/**
 * @quiz/database
 * Clean Cloudflare Hyperdrive & Edge-Ready Database Utility for Prisma ORM
 * 
 * Cloudflare Hyperdrive manages connection pooling, query caching, and TCP tunneling
 * at the edge network layer. No native Node.js TCP drivers (e.g. mysql2) or driver
 * adapters (@prisma/adapter-mysql) are required. PrismaClient overrides the
 * `datasourceUrl` with Hyperdrive's accelerated connection string.
 */

import { PrismaClient } from '@prisma/client';

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

/** Cache of active PrismaClient instances keyed by connection string within the isolate */
const clientCache = new Map<string, PrismaClient>();

/**
 * Resolves the database connection string from environment bindings.
 * Cloudflare Hyperdrive connection strings (c.env.HYPERDRIVE.connectionString) are prioritized.
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
 * Returns a PrismaClient configured to route queries through Cloudflare Hyperdrive.
 * Hyperdrive connection strings are provided via `datasourceUrl`.
 * Instances are cached within the Worker isolate to prevent memory leaks and connection exhaustion.
 *
 * @param connectionStringOrOptions Connection string, DatabaseClientOptions, or DatabaseEnv bindings
 */
export function getPrismaClient(
  connectionStringOrOptions?: string | DatabaseClientOptions | DatabaseEnv
): PrismaClient {
  let connectionString = '';
  let logQueries = false;

  if (typeof connectionStringOrOptions === 'string') {
    connectionString = connectionStringOrOptions;
  } else if (connectionStringOrOptions) {
    if (
      'DATABASE_URL' in connectionStringOrOptions ||
      'HYPERDRIVE' in connectionStringOrOptions ||
      'QUIZ_DATABASE_URL' in connectionStringOrOptions
    ) {
      connectionString = resolveDatabaseUrl(connectionStringOrOptions as DatabaseEnv);
    } else {
      const opts = connectionStringOrOptions as DatabaseClientOptions;
      connectionString = opts.datasourceUrl || resolveDatabaseUrl(opts.env);
      logQueries = !!opts.logQueries;
    }
  } else {
    connectionString = resolveDatabaseUrl();
  }

  if (!connectionString) {
    throw new Error(
      '[Prisma Edge Error] Missing connection string: DATABASE_URL or c.env.HYPERDRIVE.connectionString must be provided to instantiate PrismaClient in Cloudflare Workers.'
    );
  }

  const cached = clientCache.get(connectionString);
  if (cached) {
    return cached;
  }

  const client = new PrismaClient({
    datasourceUrl: connectionString,
    log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error', 'warn'],
  });

  clientCache.set(connectionString, client);
  return client;
}

/**
 * Runs an active diagnostic ping (SELECT 1) against the database to confirm
 * credentials, network routing, and MySQL responsiveness via Hyperdrive.
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
 * Disconnects all cached Prisma clients and clears the isolate cache.
 */
export async function disconnectAll(): Promise<void> {
  const disconnectPromises = Array.from(clientCache.values()).map((client) => client.$disconnect());
  await Promise.all(disconnectPromises);
  clientCache.clear();
}
