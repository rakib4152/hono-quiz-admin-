/**
 * Database Proof-of-Concept / Connectivity Check Route
 */

import { AppEnv } from '../env.js';
import {
  resolveDatabaseUrl,
  createDrizzleClient,
  verifyDatabaseConnection,
  endDrizzleConnection,
} from '../../../packages/database/src/index.js';

export async function handlePocCheck({
  env,
  req,
  json,
  executionCtx,
}: {
  env: AppEnv['Bindings'];
  req: Request;
  json: (data: any, status?: number) => Response;
  executionCtx: { waitUntil: (p: Promise<any>) => void };
}) {
  const connectionUrl = resolveDatabaseUrl(env as any);

  if (!connectionUrl && !env?.HYPERDRIVE) {
    return json(
      {
        connected: false,
        error: 'No database connection configured. Please set DATABASE_URL or configure HYPERDRIVE in wrangler.jsonc.',
        bindingsFound: Object.keys(env || {}),
      },
      500
    );
  }

  const db = await createDrizzleClient(env);
  try {
    const probe = await verifyDatabaseConnection(db);

    return json({
      connected: probe.ok,
      latencyMs: probe.latencyMs,
      database: 'u427015050_quiz',
      driver: env?.HYPERDRIVE ? 'Cloudflare Hyperdrive (Accelerated Pooling via Drizzle/mysql2)' : 'Direct MySQL TCP (Drizzle/mysql2)',
      sslEnabled: true,
      error: probe.error,
    }, probe.ok ? 200 : 500);
  } catch (err: any) {
    return json(
      {
        connected: false,
        database: 'u427015050_quiz',
        error: err?.cause?.message || err?.message || String(err),
      },
      500
    );
  } finally {
    executionCtx.waitUntil(endDrizzleConnection(db));
  }
}
