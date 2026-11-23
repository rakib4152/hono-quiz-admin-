/**
 * Microservice: Auth Service (Email/Password JWT + Clerk Authentication Integrated)
 * Database: Hostinger MySQL (users table via Drizzle ORM)
 * Responsibilities: Register, Login, Clerk User Sync, Session Validation, RBAC Role Checks, Devices
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { UserRole } from '@shared-types';
import {
  createDrizzleClient,
  endDrizzleConnection,
  type DrizzleDB,
} from '../../../packages/database/src/index.js';
import { users } from '../../../packages/database/src/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  decodeBase64UrlJson,
  hashPassword,
  verifyPassword,
  signAuthToken,
  resolveBearerIdentity,
} from './crypto.js';

export {
  hashPassword,
  verifyPassword,
  signAuthToken,
  resolveBearerIdentity,
};

export interface AuthUserEntity {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ClerkUserEntity = AuthUserEntity;

export interface DeviceEntity {
  id: string;
  userId: string;
  deviceKey: string;
  platform: string;
  userAgent?: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

type AuthBindings = {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  QUIZ_DATABASE_URL?: string;
  CORS_ALLOWED_ORIGINS?: string;
  JWT_SECRET?: string;
  [key: string]: any;
};

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException?: () => void;
}

const VALID_ROLES = ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'] as const;

const RegisterBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(191),
  email: z.string().trim().email('Valid email address is required').max(191),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  deviceInfo: z
    .object({
      userAgent: z.string().max(300).optional(),
      platform: z.string().max(100).optional(),
      deviceKey: z.string().max(120).optional(),
    })
    .optional(),
});

const LoginBodySchema = z.object({
  email: z.string().trim().email('Valid email address is required').max(191),
  password: z.string().min(1, 'Password is required').max(128),
  deviceInfo: z
    .object({
      userAgent: z.string().max(300).optional(),
      platform: z.string().max(100).optional(),
      deviceKey: z.string().max(120).optional(),
    })
    .optional(),
});

const ClerkSyncBodySchema = z.object({
  clerkUserId: z.string().trim().min(1).max(64).optional(),
  id: z.string().trim().min(1).max(64).optional(),
  userId: z.string().trim().min(1).max(64).optional(),
  email: z.string().trim().email('Valid email address is required').max(191).optional(),
  name: z.string().trim().max(191).optional().nullable(),
  fullName: z.string().trim().max(191).optional().nullable(),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  username: z.string().trim().max(100).optional().nullable(),
  role: z.enum(VALID_ROLES).optional(),
  avatarUrl: z.string().trim().max(512).optional().nullable(),
  imageUrl: z.string().trim().max(512).optional().nullable(),
});

// In-memory store for fast edge resolution & active device sessions
export const clerkAuthStore = {
  users: new Map<string, AuthUserEntity>(),
  devices: new Map<string, DeviceEntity>(),
};

/**
 * Safely closes a per-request Drizzle connection using executionCtx.waitUntil on Workers
 * or awaiting directly in Node.js / test runtimes.
 */
async function closeDbConnection(db: DrizzleDB, executionCtx?: WorkerExecutionContext): Promise<void> {
  const cleanup = endDrizzleConnection(db);
  if (executionCtx && typeof executionCtx.waitUntil === 'function') {
    executionCtx.waitUntil(cleanup);
  } else {
    await cleanup;
  }
}

function generateUserId(): string {
  const rand = new Uint8Array(8);
  crypto.getRandomValues(rand);
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return `usr_${hex}`;
}

function recordDeviceSession(
  userId: string,
  deviceInfo?: { userAgent?: string; platform?: string; deviceKey?: string }
): DeviceEntity {
  const platform = deviceInfo?.platform?.trim() || 'web';
  const userAgent = deviceInfo?.userAgent?.trim() || null;
  const deviceKey =
    deviceInfo?.deviceKey?.trim() ||
    `${platform.toLowerCase().replace(/[^a-z0-9_-]/g, '')}_${userAgent ? userAgent.slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, '') : 'default'}`;
  const devId = `dev_${userId}_${deviceKey}`.slice(0, 80);

  const existing = clerkAuthStore.devices.get(devId);
  const device: DeviceEntity = {
    id: devId,
    userId,
    deviceKey,
    platform,
    userAgent,
    lastSeenAt: new Date(),
    createdAt: existing?.createdAt || new Date(),
  };
  clerkAuthStore.devices.set(devId, device);
  return device;
}

/**
 * Parses a Clerk JWT token payload (used during Clerk sync & claim checks).
 */
export function extractClerkClaims(
  token?: string
): { userId?: string; email?: string; name?: string; role?: UserRole; isJwt?: boolean } | null {
  if (!token) return null;
  try {
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const claims = decodeBase64UrlJson(parts[1]);
        if (claims) {
          const claimRole =
            claims.role ||
            claims.public_metadata?.role ||
            claims.publicMetadata?.role ||
            claims.metadata?.role;
          const fullName =
            claims.name ||
            claims.full_name ||
            [claims.given_name || claims.first_name, claims.family_name || claims.last_name]
              .filter(Boolean)
              .join(' ')
              .trim() ||
            undefined;
          return {
            userId: claims.sub || claims.userId || claims.id,
            email:
              claims.email ||
              claims.primary_email_address ||
              claims.email_address,
            name: fullName,
            role: VALID_ROLES.includes(claimRole) ? (claimRole as UserRole) : undefined,
            isJwt: true,
          };
        }
      }
    }
  } catch {
    // Ignore malformed token strings
  }
  return null;
}

let usersColumnVerified = false;

async function ensureUsersIdColumnCapacity(db: DrizzleDB): Promise<void> {
  if (usersColumnVerified) return;
  try {
    const [rows]: any = await db.execute(sql`
      SELECT CHARACTER_MAXIMUM_LENGTH AS maxLen
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'id'
      LIMIT 1
    `);
    const maxLen = Number(Array.isArray(rows) ? rows[0]?.maxLen : rows?.maxLen || 0);
    if (maxLen > 0 && maxLen < 64) {
      await db.execute(sql`ALTER TABLE users MODIFY COLUMN id VARCHAR(64) NOT NULL`);
    }
    usersColumnVerified = true;
  } catch {
    // Do not block if INFORMATION_SCHEMA / ALTER privileges are restricted
  }
}

function sanitizeUserResponse(user: {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    role: (VALID_ROLES.includes(user.role as UserRole) ? user.role : 'USER') as UserRole,
    isActive: user.isActive,
    ...(user.avatarUrl !== undefined ? { avatarUrl: user.avatarUrl } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    ...(user.updatedAt ? { updatedAt: user.updatedAt } : {}),
  };
}

/**
 * Atomically creates or updates a Clerk-authenticated user in Hostinger MySQL `users` via Drizzle ORM.
 */
export async function syncClerkUserInDatabase(
  db: DrizzleDB,
  input: {
    clerkUserId: string;
    email: string;
    name: string | null;
    explicitRole?: UserRole;
  }
): Promise<{
  action: 'created' | 'updated';
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}> {
  await ensureUsersIdColumnCapacity(db);
  const normalizedEmail = input.email.trim().toLowerCase();

  const [existingById] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.clerkUserId))
    .limit(1);

  if (existingById) {
    const nextName =
      input.name !== null && input.name !== '' ? input.name : existingById.name;
    const nextRole = (input.explicitRole || existingById.role || 'USER') as UserRole;

    await db
      .update(users)
      .set({
        name: nextName,
        email: normalizedEmail,
        role: nextRole,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.clerkUserId));

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, input.clerkUserId))
      .limit(1);

    return {
      action: 'updated',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: (updatedUser.role as UserRole) || 'USER',
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingByEmail) {
    const nextName =
      input.name !== null && input.name !== '' ? input.name : existingByEmail.name;
    const nextRole = (input.explicitRole || existingByEmail.role || 'USER') as UserRole;
    let effectiveId = input.clerkUserId;

    try {
      await db
        .update(users)
        .set({
          id: input.clerkUserId,
          name: nextName,
          role: nextRole,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id));
    } catch (pkErr: any) {
      const errCode = pkErr?.cause?.code || pkErr?.code;
      const errNo = pkErr?.cause?.errno || pkErr?.errno;
      if (errCode === 'ER_ROW_IS_REFERENCED_2' || errNo === 1451) {
        effectiveId = existingByEmail.id;
        await db
          .update(users)
          .set({
            name: nextName,
            role: nextRole,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id));
      } else {
        throw pkErr;
      }
    }

    const [linkedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, effectiveId))
      .limit(1);

    return {
      action: 'updated',
      user: {
        id: linkedUser.id,
        name: linkedUser.name,
        email: linkedUser.email,
        role: (linkedUser.role as UserRole) || 'USER',
        isActive: linkedUser.isActive,
        createdAt: linkedUser.createdAt,
        updatedAt: linkedUser.updatedAt,
      },
    };
  }

  const initialRole: UserRole = input.explicitRole || 'USER';

  await db
    .insert(users)
    .values({
      id: input.clerkUserId,
      name: input.name,
      email: normalizedEmail,
      role: initialRole,
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        name: input.name,
        email: normalizedEmail,
        updatedAt: new Date(),
      },
    });

  const [createdUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.clerkUserId))
    .limit(1);

  return {
    action: 'created',
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: (createdUser.role as UserRole) || 'USER',
      isActive: createdUser.isActive,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt,
    },
  };
}

/**
 * Shared handler for email + password registration (POST /api/v1/auth/register)
 */
async function executePasswordRegister(params: {
  rawBody: any;
  correlationId: string;
  env?: any;
  executionCtx?: WorkerExecutionContext;
}): Promise<{ status: number; data: Record<string, any> }> {
  const { rawBody, correlationId, env, executionCtx } = params;
  const parsedResult = RegisterBodySchema.safeParse(rawBody || {});
  if (!parsedResult.success) {
    return {
      status: 400,
      data: {
        success: false,
        error: parsedResult.error.issues[0]?.message || 'Invalid registration payload',
        details: parsedResult.error.issues,
        correlationId,
      },
    };
  }

  const { name, email, password, deviceInfo } = parsedResult.data;
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await hashPassword(password);

  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(env);
    await ensureUsersIdColumnCapacity(db);

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return {
        status: 409,
        data: {
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          error: 'An account with this email already exists',
          correlationId,
        },
      };
    }

    // Bootstrap first SUPER_ADMIN only if no admin accounts exist yet; otherwise always USER
    const existingAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['ADMIN', 'SUPER_ADMIN']))
      .limit(1);
    const assignedRole: UserRole = existingAdmins.length === 0 ? 'SUPER_ADMIN' : 'USER';

    const newUserId = generateUserId();
    await db.insert(users).values({
      id: newUserId,
      name,
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      isActive: true,
    });

    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUserId))
      .limit(1);

    const safeUser = sanitizeUserResponse(created);
    clerkAuthStore.users.set(safeUser.id, {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      isActive: safeUser.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });

    const device = recordDeviceSession(safeUser.id, deviceInfo);
    const token = await signAuthToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
      },
      env
    );

    return {
      status: 201,
      data: {
        success: true,
        message: 'User registered successfully',
        token,
        authToken: token,
        user: safeUser,
        device,
        correlationId,
      },
    };
  } catch (err: any) {
    const errCode = err?.cause?.code || err?.code;
    const errNo = err?.cause?.errno || err?.errno;
    if (errCode === 'ER_DUP_ENTRY' || errNo === 1062) {
      return {
        status: 409,
        data: {
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          error: 'An account with this email already exists',
          correlationId,
        },
      };
    }
    console.error('[Auth Register] Database error:', err);
    return {
      status: 500,
      data: {
        success: false,
        error: err?.cause?.sqlMessage || err?.message || 'Registration failed',
        correlationId,
      },
    };
  } finally {
    if (db) {
      await closeDbConnection(db, executionCtx);
    }
  }
}

/**
 * Shared handler for email + password login (POST /api/v1/auth/login)
 */
async function executePasswordLogin(params: {
  rawBody: any;
  correlationId: string;
  env?: any;
  executionCtx?: WorkerExecutionContext;
}): Promise<{ status: number; data: Record<string, any> }> {
  const { rawBody, correlationId, env, executionCtx } = params;
  const parsedResult = LoginBodySchema.safeParse(rawBody || {});
  if (!parsedResult.success) {
    return {
      status: 400,
      data: {
        success: false,
        error: parsedResult.error.issues[0]?.message || 'Email and password are required',
        details: parsedResult.error.issues,
        correlationId,
      },
    };
  }

  const { email, password, deviceInfo } = parsedResult.data;
  const normalizedEmail = email.toLowerCase();

  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(env);
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!dbUser || !dbUser.passwordHash) {
      return {
        status: 401,
        data: {
          success: false,
          error: 'Invalid email or password',
          correlationId,
        },
      };
    }

    if (!dbUser.isActive) {
      return {
        status: 403,
        data: {
          success: false,
          error: 'Account is suspended or inactive',
          correlationId,
        },
      };
    }

    const validPassword = await verifyPassword(password, dbUser.passwordHash);
    if (!validPassword) {
      return {
        status: 401,
        data: {
          success: false,
          error: 'Invalid email or password',
          correlationId,
        },
      };
    }

    const safeUser = sanitizeUserResponse(dbUser);
    clerkAuthStore.users.set(safeUser.id, {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      isActive: safeUser.isActive,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });

    const device = recordDeviceSession(safeUser.id, deviceInfo);
    const token = await signAuthToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
      },
      env
    );

    return {
      status: 200,
      data: {
        success: true,
        message: 'Login successful',
        token,
        authToken: token,
        user: safeUser,
        device,
        correlationId,
      },
    };
  } catch (err: any) {
    console.error('[Auth Login] Database error:', err);
    return {
      status: 500,
      data: {
        success: false,
        error: err?.cause?.sqlMessage || err?.message || 'Login failed',
        correlationId,
      },
    };
  } finally {
    if (db) {
      await closeDbConnection(db, executionCtx);
    }
  }
}

/**
 * Shared handler for POST /auth/clerk-sync (and /api/v1/auth/clerk-sync)
 */
async function executeClerkSync(params: {
  rawBody: any;
  token?: string;
  headerClerkUserId?: string;
  correlationId: string;
  env?: any;
  executionCtx?: WorkerExecutionContext;
  requireDatabase?: boolean;
}): Promise<{ status: number; data: Record<string, any> }> {
  const {
    rawBody,
    token,
    headerClerkUserId,
    correlationId,
    env,
    executionCtx,
    requireDatabase = true,
  } = params;

  const verifiedIdentity = await resolveBearerIdentity(token, env);
  const claims = verifiedIdentity
    ? {
        userId: verifiedIdentity.userId,
        email: verifiedIdentity.email,
        name: verifiedIdentity.name,
        role: verifiedIdentity.role,
        isJwt: true,
      }
    : null;

  const sourcePayload =
    rawBody?.data && typeof rawBody.data === 'object' && rawBody.data.id
      ? rawBody.data
      : rawBody || {};

  const nestedEmail =
    sourcePayload?.primaryEmailAddress?.emailAddress ||
    sourcePayload?.primary_email_address ||
    (Array.isArray(sourcePayload?.emailAddresses)
      ? sourcePayload.emailAddresses[0]?.emailAddress
      : undefined) ||
    (Array.isArray(sourcePayload?.email_addresses)
      ? sourcePayload.email_addresses[0]?.email_address
      : undefined);

  const parsedResult = ClerkSyncBodySchema.safeParse({
    ...sourcePayload,
    email: sourcePayload?.email || nestedEmail || claims?.email,
  });

  if (!parsedResult.success) {
    const firstIssue = parsedResult.error.issues[0];
    return {
      status: 400,
      data: {
        success: false,
        error: firstIssue?.message || 'Invalid Clerk user payload',
        details: parsedResult.error.issues,
        correlationId,
      },
    };
  }

  const parsed = parsedResult.data;
  const bodyUserId = parsed.clerkUserId || parsed.id || parsed.userId;

  if (claims?.isJwt && claims.userId && bodyUserId && claims.userId !== bodyUserId) {
    return {
      status: 403,
      data: {
        success: false,
        error: 'Forbidden: clerkUserId does not match authenticated Clerk token subject',
        correlationId,
      },
    };
  }

  const targetUserId = bodyUserId || claims?.userId || headerClerkUserId?.trim();
  const targetEmail = parsed.email;

  if (!targetUserId || !targetEmail) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'clerkUserId and a valid email are required for Clerk synchronization',
        correlationId,
      },
    };
  }

  const resolvedName =
    parsed.name ??
    parsed.fullName ??
    ([parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim() ||
      parsed.username ||
      claims?.name ||
      null);

  // Never allow unverified body payloads to elevate role; only accept role from JWT claims
  const explicitRole = claims?.isJwt ? claims.role : undefined;
  const avatarUrl = parsed.avatarUrl ?? parsed.imageUrl ?? null;

  if (env || requireDatabase) {
    let db: DrizzleDB | null = null;
    try {
      db = await createDrizzleClient(env);
      const syncResult = await syncClerkUserInDatabase(db, {
        clerkUserId: targetUserId,
        email: targetEmail,
        name: resolvedName,
        explicitRole,
      });

      const cachedEntity: AuthUserEntity = {
        id: syncResult.user.id,
        name: syncResult.user.name,
        email: syncResult.user.email || targetEmail.toLowerCase(),
        role: syncResult.user.role,
        isActive: syncResult.user.isActive,
        avatarUrl,
        createdAt: syncResult.user.createdAt,
        updatedAt: syncResult.user.updatedAt,
      };
      clerkAuthStore.users.set(cachedEntity.id, cachedEntity);

      return {
        status: syncResult.action === 'created' ? 201 : 200,
        data: {
          success: true,
          action: syncResult.action,
          message:
            syncResult.action === 'created'
              ? 'Clerk user created in Hostinger MySQL database'
              : 'Clerk user updated in Hostinger MySQL database',
          user: syncResult.user,
          data: syncResult.user,
          dbSynced: true,
          authProvider: 'Clerk',
          clerkAppId: 'app_3LavFW7A5cCB70BWweaphvP77wn',
          correlationId,
        },
      };
    } catch (dbErr: any) {
      const errCode = dbErr?.cause?.code || dbErr?.code;
      const errNo = dbErr?.cause?.errno || dbErr?.errno;
      console.error('[Clerk Auth Sync] Hostinger MySQL Drizzle error:', dbErr);

      if (errCode === 'ER_DUP_ENTRY' || errNo === 1062) {
        return {
          status: 409,
          data: {
            success: false,
            code: 'DUPLICATE_USER',
            error: 'A user record with this email or Clerk ID already exists',
            correlationId,
          },
        };
      }

      return {
        status: 500,
        data: {
          success: false,
          code: errCode || 'DATABASE_SYNC_ERROR',
          error:
            dbErr?.cause?.sqlMessage ||
            dbErr?.message ||
            'Failed to synchronize Clerk user with Hostinger MySQL',
          correlationId,
        },
      };
    } finally {
      if (db) {
        await closeDbConnection(db, executionCtx);
      }
    }
  }

  const existing = clerkAuthStore.users.get(targetUserId);
  const syncedUser: AuthUserEntity = {
    id: targetUserId,
    name: resolvedName ?? existing?.name ?? null,
    email: targetEmail.toLowerCase(),
    role: (explicitRole || existing?.role || 'USER') as UserRole,
    isActive: true,
    avatarUrl,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };
  clerkAuthStore.users.set(targetUserId, syncedUser);

  return {
    status: existing ? 200 : 201,
    data: {
      success: true,
      action: existing ? 'updated' : 'created',
      message: 'Clerk user synchronized in local store (no database binding provided)',
      user: syncedUser,
      data: syncedUser,
      dbSynced: false,
      authProvider: 'Clerk',
      clerkAppId: 'app_3LavFW7A5cCB70BWweaphvP77wn',
      correlationId,
    },
  };
}

function getExecutionCtx(c: any): WorkerExecutionContext | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the authenticated user entity from a Bearer token (HS256 JWT or Clerk JWT).
 */
export async function resolveAuthenticatedUser(params: {
  token?: string;
  env?: any;
  executionCtx?: WorkerExecutionContext;
}): Promise<AuthUserEntity | null> {
  const { token, env, executionCtx } = params;
  const identity = await resolveBearerIdentity(token, env);
  if (!identity?.userId) return null;

  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(env);
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, identity.userId))
      .limit(1);

    if (dbUser) {
      if (!dbUser.isActive) return null;
      const resolved: AuthUserEntity = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email || identity.email || '',
        role: (VALID_ROLES.includes(dbUser.role as UserRole) ? dbUser.role : 'USER') as UserRole,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      };
      clerkAuthStore.users.set(resolved.id, resolved);
      return resolved;
    }
  } catch {
    // Fall back to verified token claims / memory cache if DB is temporarily unreachable
  } finally {
    if (db) {
      await closeDbConnection(db, executionCtx);
    }
  }

  const cached = clerkAuthStore.users.get(identity.userId);
  if (cached) return cached;

  // For verified HS256 JWTs or Clerk JWTs when user is not yet in cache
  if (identity.authMethod === 'jwt' || identity.authMethod === 'clerk_jwt') {
    return {
      id: identity.userId,
      name: identity.name || null,
      email: identity.email || '',
      role: identity.role || 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return null;
}

/**
 * Native Hono Sub-Router for Authentication & Device Endpoints
 * Mounted under both `/api/v1` and `/` in apps/src/index.ts
 */
export const authApp = new Hono<{ Bindings: AuthBindings }>();

const handleClerkSyncRequest = async (c: any) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  const headerClerkUserId = c.req.header('X-Clerk-User-Id') || '';
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  const rawBody = await c.req.json().catch(() => ({}));

  const res = await executeClerkSync({
    rawBody,
    token,
    headerClerkUserId,
    correlationId,
    env: c.env,
    executionCtx: getExecutionCtx(c),
    requireDatabase: true,
  });
  return c.json(res.data, res.status as any);
};

const handleRegisterRequest = async (c: any) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  const headerClerkUserId = c.req.header('X-Clerk-User-Id') || '';
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  const rawBody = await c.req.json().catch(() => ({}));

  // If payload carries a Clerk user ID (and no password), run Clerk sync; otherwise register email+password
  const isClerkPayload = Boolean(
    (rawBody?.clerkUserId || rawBody?.data?.id || headerClerkUserId) && !rawBody?.password
  );

  const res = isClerkPayload
    ? await executeClerkSync({
        rawBody,
        token,
        headerClerkUserId,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c),
        requireDatabase: true,
      })
    : await executePasswordRegister({
        rawBody,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c),
      });

  return c.json(res.data, res.status as any);
};

const handleLoginRequest = async (c: any) => {
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  const rawBody = await c.req.json().catch(() => ({}));

  const res = await executePasswordLogin({
    rawBody,
    correlationId,
    env: c.env,
    executionCtx: getExecutionCtx(c),
  });
  return c.json(res.data, res.status as any);
};

authApp.post('/auth/clerk-sync', handleClerkSyncRequest);
authApp.post('/auth/clerk-sync/', handleClerkSyncRequest);
authApp.post('/auth/sync', handleClerkSyncRequest);
authApp.post('/auth/sync/', handleClerkSyncRequest);
authApp.post('/auth/register', handleRegisterRequest);
authApp.post('/auth/register/', handleRegisterRequest);
authApp.post('/auth/signup', handleRegisterRequest);
authApp.post('/auth/signup/', handleRegisterRequest);
authApp.post('/auth/login', handleLoginRequest);
authApp.post('/auth/login/', handleLoginRequest);

const handleAuthProbe = (c: any) => {
  return c.json(
    {
      success: true,
      endpoints: [
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/clerk-sync',
        'GET /api/v1/auth/me',
        'GET /api/v1/devices',
        'POST /api/v1/devices/register',
      ],
      message: 'Authentication endpoints are active.',
    },
    200
  );
};

authApp.get('/auth/clerk-sync', handleAuthProbe);
authApp.get('/auth/register', handleAuthProbe);
authApp.get('/auth/login', handleAuthProbe);

authApp.post('/internal/verify-token', async (c) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  const body = await c.req.json().catch(() => ({}));

  const res = await authService.handle({
    path: '/internal/verify-token',
    method: 'POST',
    body,
    token,
    correlationId,
    env: c.env,
    executionCtx: getExecutionCtx(c),
  });
  return c.json(res.data, res.status as any);
});

const forwardToAuthService = async (c: any) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  const clerkUserId = c.req.header('X-Clerk-User-Id') || '';
  const correlationId = c.req.header('X-Correlation-ID') || `corr_${Date.now()}`;
  const subPath = c.req.path.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';

  const res = await authService.handle({
    path: subPath,
    method: c.req.method,
    body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : await c.req.json().catch(() => ({})),
    token,
    clerkUserId,
    correlationId,
    env: c.env,
    executionCtx: getExecutionCtx(c),
  });
  return c.json(res.data, res.status as any);
};

authApp.all('/auth/*', forwardToAuthService);
authApp.all('/devices', forwardToAuthService);
authApp.all('/devices/*', forwardToAuthService);

export const authService = {
  async handle(req: {
    path: string;
    method: string;
    body?: any;
    token?: string;
    correlationId: string;
    env?: any;
    clerkUserId?: string;
    executionCtx?: WorkerExecutionContext;
  }): Promise<{ status: number; data: Record<string, any> }> {
    const { path, method, body, token, correlationId, env, clerkUserId, executionCtx } = req;

    if (path === '/auth/register' || path === '/auth/signup') {
      if (body?.password) {
        return executePasswordRegister({ rawBody: body, correlationId, env, executionCtx });
      }
      return executeClerkSync({
        rawBody: body,
        token,
        headerClerkUserId: clerkUserId,
        correlationId,
        env,
        executionCtx,
        requireDatabase: Boolean(env),
      });
    }

    if (path === '/auth/login' && method === 'POST') {
      return executePasswordLogin({ rawBody: body, correlationId, env, executionCtx });
    }

    if (path === '/auth/clerk-sync' || path === '/auth/sync') {
      return executeClerkSync({
        rawBody: body,
        token,
        headerClerkUserId: clerkUserId,
        correlationId,
        env,
        executionCtx,
        requireDatabase: Boolean(env),
      });
    }

    // GET /auth/me - Get Current User Profile
    if (path === '/auth/me' && method === 'GET') {
      const user = await resolveAuthenticatedUser({ token, env, executionCtx });
      if (!user) {
        return {
          status: 401,
          data: {
            success: false,
            error: 'Unauthorized: Valid Bearer token required',
            correlationId,
          },
        };
      }
      return {
        status: 200,
        data: {
          success: true,
          user: sanitizeUserResponse(user),
          correlationId,
        },
      };
    }

    // GET /devices - List Active Devices for Authenticated User
    if (path === '/devices' && method === 'GET') {
      const user = await resolveAuthenticatedUser({ token, env, executionCtx });
      if (!user) {
        return {
          status: 401,
          data: {
            success: false,
            error: 'Unauthorized: Valid Bearer token required',
            correlationId,
          },
        };
      }
      const userDevices = Array.from(clerkAuthStore.devices.values())
        .filter((d) => d.userId === user.id)
        .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

      return {
        status: 200,
        data: {
          success: true,
          count: userDevices.length,
          devices: userDevices,
          data: userDevices,
          correlationId,
        },
      };
    }

    // POST /devices/register - Register Device for Authenticated User
    if (path === '/devices/register' && method === 'POST') {
      const user = await resolveAuthenticatedUser({ token, env, executionCtx });
      if (!user) {
        return {
          status: 401,
          data: {
            success: false,
            error: 'Unauthorized: Valid Bearer token required to register device',
            correlationId,
          },
        };
      }
      const device = recordDeviceSession(user.id, {
        deviceKey: body?.deviceKey,
        platform: body?.platform || 'expo',
        userAgent: body?.userAgent,
      });
      return {
        status: 200,
        data: {
          success: true,
          device,
          correlationId,
        },
      };
    }

    // DELETE /devices/:id - Revoke Own Device
    const matchDeleteDevice = path.match(/^\/devices\/([^/]+)$/);
    if (matchDeleteDevice && method === 'DELETE') {
      const user = await resolveAuthenticatedUser({ token, env, executionCtx });
      if (!user) {
        return {
          status: 401,
          data: { success: false, error: 'Unauthorized', correlationId },
        };
      }
      const devId = matchDeleteDevice[1];
      const existing = clerkAuthStore.devices.get(devId);
      if (!existing || existing.userId !== user.id) {
        return {
          status: 404,
          data: { success: false, error: 'Device not found', correlationId },
        };
      }
      clerkAuthStore.devices.delete(devId);
      return {
        status: 200,
        data: { success: true, deletedId: devId, correlationId },
      };
    }

    // POST /internal/verify-token
    if (path === '/internal/verify-token' && method === 'POST') {
      const targetToken = body?.token || token;
      const user = await resolveAuthenticatedUser({ token: targetToken, env, executionCtx });
      if (user) {
        return {
          status: 200,
          data: {
            success: true,
            valid: true,
            user: sanitizeUserResponse(user),
            correlationId,
          },
        };
      }
      return {
        status: 401,
        data: {
          success: false,
          valid: false,
          error: 'Invalid or expired authentication token',
          correlationId,
        },
      };
    }

    return {
      status: 404,
      data: {
        success: false,
        error: `Auth endpoint '${path}' not found`,
        correlationId,
      },
    };
  },
};

export default authApp;