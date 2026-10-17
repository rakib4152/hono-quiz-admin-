import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

export * from './schema'
export { schema }

/**
 * Creates a Drizzle DB instance using Hyperdrive env or DATABASE_URL
 * Optimized for Cloudflare Workers environment
 */
export function createDrizzleClient(env: any) {
  let connectionString = ''
  
  if (env?.HYPERDRIVE) {
    connectionString = env.HYPERDRIVE.connectionString || resolveDatabaseUrl(env)
  } else {
    connectionString = env?.DATABASE_URL || process.env.DATABASE_URL || ''
  }

  // Parse the connection string to create a connection pool
  // Avoid SSL options that aren't supported in Cloudflare Workers
  try {
    const url = new URL(connectionString);
    const connection = mysql.createPool({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // remove leading '/'
      // Critical: Disable SSL options that cause issues in Miniflare/wrangler
      ssl: false,
      multipleStatements: true,
      // Additional Cloudflare Worker optimizations
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
    return drizzle(connection, { schema, mode: 'default' })
  } catch (error) {
    // Fallback to URI-based connection if parsing fails
    console.warn('Failed to parse connection string, falling back to URI mode:', error)
    const pool = mysql.createPool({
      uri: connectionString,
      ssl: false,
      multipleStatements: true,
    })
    return drizzle(pool, { schema, mode: 'default' })
  }
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
    // Construct from individual Hyperdrive properties
    const { user, password, host, port, database } = env.HYPERDRIVE
    return `mysql://${user}:${password}@${host}:${port || 3306}/${database}`
  }
  return env?.DATABASE_URL || process.env.DATABASE_URL || ''
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

export interface DatabaseEnv {
  DATABASE_URL?: string
  HYPERDRIVE?: { connectionString: string }
  [key: string]: any
}