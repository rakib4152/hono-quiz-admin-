import { z } from 'zod';

/**
 * Phase 1 System Probe Contract
 */
export const SystemProbeSchema = z.object({
  id: z.string().uuid(),
  probeName: z.string().min(1).max(100),
  testMessage: z.string(),
  banglaPayload: z.string().optional(),
  latencyMs: z.number().int().nonnegative(),
  isSuccessful: z.boolean(),
  createdAt: z.string().datetime(),
});

export type SystemProbeDTO = z.infer<typeof SystemProbeSchema>;

/**
 * Database Verification Request & Response Contract
 */
export const DatabaseVerifyResponseSchema = z.object({
  success: z.boolean(),
  phase: z.string(),
  timestamp: z.string(),
  report: z.object({
    host: z.string(),
    database: z.string(),
    sslTlsMode: z.string(),
    databaseEngine: z.string().optional(),
    prismaAdapter: z.string(),
    measuredLatencyMs: z.number(),
    banglaUnicodeSupport: z.string(),
    hyperdriveStatus: z.string(),
  }),
  verificationChecklist: z.object({
    remotePort3306Open: z.boolean(),
    credentialsValid: z.boolean(),
    transactionSupport: z.string(),
    connectionPooling: z.string(),
  }),
});

export type DatabaseVerifyResponse = z.infer<typeof DatabaseVerifyResponseSchema>;

/**
 * Health Check Contract
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  environment: z.string(),
  version: z.string(),
  hyperdriveBindingPresent: z.boolean(),
  kvBindingPresent: z.boolean(),
  r2BindingPresent: z.boolean(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
