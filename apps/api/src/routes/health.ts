/**
 * System Health & Observability Endpoints
 */

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  hyperdriveBindingPresent: boolean;
  kvBindingPresent: boolean;
  r2BindingPresent: boolean;
}

export function createHealthHandler(env: any, uptimeStart: number): HealthResponse {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - uptimeStart) / 1000),
    environment: env.ENVIRONMENT || 'production',
    version: '1.0.0-phase1',
    hyperdriveBindingPresent: !!env.HYPERDRIVE,
    kvBindingPresent: !!env.CACHE_KV,
    r2BindingPresent: !!env.ASSETS_R2,
  };
}
