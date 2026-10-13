import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

export * from './schema'
export { schema }

/**
 * Creates a Drizzle DB instance using Hyperdrive env or DATABASE_URL
 */
export function createDrizzleClient(env: any) {
  if (env?.HYPERDRIVE) {
    const connection = mysql.createPool({
      host: env.HYPERDRIVE.host,
      user: env.HYPERDRIVE.user,
      password: env.HYPERDRIVE.password,
      database: env.HYPERDRIVE.database,
      port: Number(env.HYPERDRIVE.port || 3306),
      ssl: { rejectUnauthorized: false },
    })
    return drizzle(connection, { schema, mode: 'default' })
  }

  const connectionString = env?.DATABASE_URL || process.env.DATABASE_URL
  const pool = mysql.createPool(connectionString)
  return drizzle(pool, { schema, mode: 'default' })
}

export type DrizzleDB = ReturnType<typeof createDrizzleClient>

// Re-exported helper functions required by apps/src/routes/poc.ts
export function resolveDatabaseUrl(env: any): string {
  if (env?.HYPERDRIVE) {
    const { user, password, host, port, database } = env.HYPERDRIVE
    return `mysql://${user}:${password}@${host}:${port || 3306}/${database}`
  }
  return env?.DATABASE_URL || process.env.DATABASE_URL || ''
}

export async function verifyDatabaseConnection(db: DrizzleDB): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch (error) {
    console.error('Database connection verification failed:', error)
    return false
  }
}