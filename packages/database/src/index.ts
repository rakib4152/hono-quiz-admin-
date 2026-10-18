import { drizzle } from 'drizzle-orm/mysql2'
import { createConnection } from 'mysql2/promise'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

export * from './schema'
export { schema }

/**
 * Creates a Drizzle DB instance using Hyperdrive env or DATABASE_URL.
 * Creates a new connection per call (per request) with disableEval: true
 * to avoid the Workers V8 isolate blocking eval() used by mysql2 internally.
 * The connection is attached to the returned db as __connection for cleanup.
 */
export async function createDrizzleClient(env: any) {
  let config: any = {
    disableEval: true,
    multipleStatements: true,
  }

  if (env?.HYPERDRIVE) {
    config.host = env.HYPERDRIVE.host
    config.port = env.HYPERDRIVE.port || 3306
    config.user = env.HYPERDRIVE.user
    config.password = env.HYPERDRIVE.password
    config.database = env.HYPERDRIVE.database
  } else {
    const connectionString = env?.DATABASE_URL || env?.QUIZ_DATABASE_URL || process.env.DATABASE_URL || ''
    const url = new URL(connectionString)
    config.host = url.hostname
    config.port = Number(url.port) || 3306
    config.user = url.username
    config.password = url.password
    config.database = url.pathname.slice(1)
  }

  const connection = await createConnection(config)
  const db = drizzle(connection, { schema, mode: 'default' })
  ;(db as any).__connection = connection
  return db
}

export type DrizzleDB = ReturnType<typeof createDrizzleClient>

/**
 * Resolves database URL prioritized by Cloudflare Hyperdrive -> DATABASE_URL
 */
export function resolveDatabaseUrl(env: any): string {
  if (env?.HYPERDRIVE) {
    if (env.HYPERDRIVE.connectionString) {
      return env.HYPERDRIVE.connectionString
    }
    const { user, password, host, port, database } = env.HYPERDRIVE
    return `mysql://${user}:${password}@${host}:${port || 3306}/${database}`
  }
  return env?.DATABASE_URL || env?.QUIZ_DATABASE_URL || process.env.DATABASE_URL || ''
}

/**
 * Diagnostic helper to test active DB connectivity
 */
export async function verifyDatabaseConnection(db: DrizzleDB): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch (error) {
    console.error('Database connection verification failed:', error)
    return false
  }
}

/**
 * Safely end a connection created by createDrizzleClient.
 * Call via c.executionCtx.waitUntil(endDrizzleConnection(db)) in route handlers.
 */
export function endDrizzleConnection(db: DrizzleDB): Promise<void> {
  const conn = (db as any).__connection
  if (conn && typeof conn.end === 'function') {
    return conn.end()
  }
  return Promise.resolve()
}

export interface DatabaseEnv {
  DATABASE_URL?: string
  QUIZ_DATABASE_URL?: string
  HYPERDRIVE?: { connectionString: string; host?: string; port?: number; database?: string; user?: string }
  [key: string]: any
}
