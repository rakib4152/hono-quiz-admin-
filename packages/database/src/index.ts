import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export * from './schema';
export { schema };

const DEFAULT_HOSTINGER_MYSQL_URL =
  'mysql://u427015050_drizzlequiz:R.r.4152@srv1562.hstgr.io:3306/u427015050_drizzle';

export function normalizeMysqlConnectionString(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let fixed = raw.trim();
  if (fixed.startsWith('ysql://')) {
    fixed = `m${fixed}`;
  }
  fixed = fixed.replace(/\/u427015050_drizzlequiz(\?.*)?$/i, '/u427015050_drizzle$1');
  return fixed;
}

/**
 * Creates a Drizzle DB instance using Hyperdrive env or DATABASE_URL.
 * Creates a new connection per call (per request) with disableEval: true
 * to avoid the Workers V8 isolate blocking eval() used by mysql2 internally.
 * The connection is attached to the returned db as __connection for cleanup.
 */
export async function createDrizzleClient(env: any): Promise<MySql2Database<typeof schema>> {
  let config: any = {
    disableEval: true,
    multipleStatements: true,
  };

  if (env?.HYPERDRIVE) {
    if (env.HYPERDRIVE.connectionString) {
      const url = new URL(normalizeMysqlConnectionString(env.HYPERDRIVE.connectionString));
      config.host = url.hostname;
      config.port = Number(url.port) || 3306;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.slice(1) || 'u427015050_drizzle';
    } else {
      config.host = env.HYPERDRIVE.host || 'srv1562.hstgr.io';
      config.port = Number(env.HYPERDRIVE.port) || 3306;
      config.user = env.HYPERDRIVE.user || 'u427015050_drizzlequiz';
      config.password = env.HYPERDRIVE.password || 'R.r.4152';
      config.database = env.HYPERDRIVE.database || 'u427015050_drizzle';
    }
  } else {
    const rawConn =
      env?.DATABASE_URL ||
      env?.QUIZ_DATABASE_URL ||
      (typeof process !== 'undefined' ? process.env?.DATABASE_URL || process.env?.QUIZ_DATABASE_URL : '') ||
      '';
    const connectionString = normalizeMysqlConnectionString(rawConn);
    if (connectionString) {
      const url = new URL(connectionString);
      config.host = url.hostname;
      config.port = Number(url.port) || 3306;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.slice(1) || 'u427015050_drizzle';
    } else {
      // Direct remote Hostinger MySQL fallback
      config.host = 'srv1562.hstgr.io';
      config.port = 3306;
      config.user = 'u427015050_drizzlequiz';
      config.password = 'R.r.4152';
      config.database = 'u427015050_drizzle';
    }
  }

  const connection = await createConnection(config);
  const db = drizzle(connection, { schema, mode: 'default' });
  (db as any).__connection = connection;
  return db;
}

export type DrizzleDB = MySql2Database<typeof schema>;

/**
 * Resolves database URL prioritized by Cloudflare Hyperdrive -> DATABASE_URL
 */
export function resolveDatabaseUrl(env: any): string {
  if (env?.HYPERDRIVE) {
    if (env.HYPERDRIVE.connectionString) {
      return normalizeMysqlConnectionString(env.HYPERDRIVE.connectionString);
    }
    const { user, password, host, port, database } = env.HYPERDRIVE;
    return `mysql://${user}:${password}@${host}:${port || 3306}/${database || 'u427015050_drizzle'}`;
  }
  const rawConn =
    env?.DATABASE_URL ||
    env?.QUIZ_DATABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.DATABASE_URL || process.env?.QUIZ_DATABASE_URL : '') ||
    '';
  return normalizeMysqlConnectionString(rawConn) || DEFAULT_HOSTINGER_MYSQL_URL;
}

export interface VerifyConnectionResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Diagnostic helper to test active DB connectivity and measure latency
 */
export async function verifyDatabaseConnection(db: DrizzleDB): Promise<VerifyConnectionResult> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      ok: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error('Database connection verification failed:', error);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error?.message || String(error),
    };
  }
}

/**
 * Safely end a connection created by createDrizzleClient.
 * Call via c.executionCtx.waitUntil(endDrizzleConnection(db)) in route handlers.
 */
export function endDrizzleConnection(db: DrizzleDB): Promise<void> {
  const conn = (db as any).__connection;
  if (conn && typeof conn.end === 'function') {
    return conn.end();
  }
  return Promise.resolve();
}

export interface DatabaseEnv {
  DATABASE_URL?: string;
  QUIZ_DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string; host?: string; port?: number; database?: string; user?: string; password?: string };
  [key: string]: any;
}
