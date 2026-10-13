import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

export * from './schema.js';
export { schema };

/**
 * Creates a Drizzle DB instance using Hyperdrive env or DATABASE_URL
 */
export function createDrizzleClient(env: any) {
  if (env?.HYPERDRIVE) {
    // If Hyperdrive provides individual credentials on Cloudflare Workers
    if (env.HYPERDRIVE.host) {
      const connection = mysql.createPool({
        host: env.HYPERDRIVE.host,
        user: env.HYPERDRIVE.user,
        password: env.HYPERDRIVE.password,
        database: env.HYPERDRIVE.database,
        port: Number(env.HYPERDRIVE.port || 3306),
        ssl: { rejectUnauthorized: false },
      });
      return drizzle(connection, { schema, mode: 'default' });
    }

    // If Hyperdrive provides connectionString
    if (env.HYPERDRIVE.connectionString) {
      const pool = mysql.createPool(env.HYPERDRIVE.connectionString);
      return drizzle(pool, { schema, mode: 'default' });
    }
  }

  // Local development / direct fallback string
  const connectionString =
    (typeof env === 'string' ? env : env?.DATABASE_URL) ||
    (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '');

  if (!connectionString) {
    console.warn('[Drizzle] No database connection string found in environment.');
  }

  const pool = mysql.createPool(connectionString || 'mysql://root:password@127.0.0.1:3306/u427015050_quiz');
  return drizzle(pool, { schema, mode: 'default' });
}

export type DrizzleDB = ReturnType<typeof createDrizzleClient>;
export type PrismaClient = any;

/**
 * Backward compatibility helpers for services migrating from Prisma to Drizzle
 */
export function resolveDatabaseUrl(env?: any): string {
  if (env?.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  if (env?.QUIZ_DATABASE_URL) return env.QUIZ_DATABASE_URL;
  if (env?.DATABASE_URL) return env.DATABASE_URL;
  if (typeof process !== 'undefined' && process.env?.DATABASE_URL) return process.env.DATABASE_URL;
  return '';
}

export function getPrismaClient(connectionStringOrEnv?: any): any {
  return createDrizzleClient(
    typeof connectionStringOrEnv === 'string'
      ? { DATABASE_URL: connectionStringOrEnv }
      : connectionStringOrEnv
  );
}

export async function verifyDatabaseConnection(
  db: any
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (db?.$queryRaw) {
      await db.$queryRaw`SELECT 1`;
    } else if (db?.execute) {
      await db.execute('SELECT 1');
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || String(err) };
  }
}
