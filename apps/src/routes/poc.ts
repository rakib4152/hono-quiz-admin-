/**
 * Database Proof-of-Concept / Connectivity Check Route
 */

import { AppEnv } from '../env.js';
import { resolveDatabaseUrl, getPrismaClient, verifyDatabaseConnection } from '../../../packages/database/src/index.js';

export async function handlePocCheck({
  env,
  req,
  json,
}: {
  env: AppEnv['Bindings'];
  req: Request;
  json: (data: any, status?: number) => Response;
}) {
  const connectionUrl = resolveDatabaseUrl(env as any);

  if (!connectionUrl) {
    return json(
      {
        connected: false,
        error: 'No database connection configured. Please set DATABASE_URL or configure HYPERDRIVE in wrangler.jsonc.',
        bindingsFound: Object.keys(env || {}),
      },
      500
    );
  }

  try {
    const prisma = getPrismaClient(connectionUrl);
    const probe = await verifyDatabaseConnection(prisma);

    return json({
      connected: probe.ok,
      latencyMs: probe.latencyMs,
      database: 'u427015050_quiz',
      driver: env?.HYPERDRIVE ? 'Cloudflare Hyperdrive (Accelerated Pooling)' : 'Direct MySQL TCP',
      sslEnabled: true,
      error: probe.error,
    }, probe.ok ? 200 : 500);
  } catch (err: any) {
    return json(
      {
        connected: false,
        database: 'u427015050_quiz',
        error: err?.message || String(err),
      },
      500
    );
  }
}
