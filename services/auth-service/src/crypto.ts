/**
 * Edge-compatible Web Crypto utilities for password hashing (PBKDF2-SHA256)
 * and JWT signing/verification (HMAC-SHA256).
 * Works identically on Cloudflare Workers and Node.js 22+.
 */

import { UserRole } from '@shared-types';

const VALID_ROLES: readonly UserRole[] = ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

// Ephemeral per-process cryptographic fallbacks when env secrets are not configured
let runtimeJwtSecret: string | null = null;
let runtimeInternalKey: string | null = null;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(obj: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return base64UrlEncodeBytes(bytes);
}

function base64UrlDecodeBytes(segment: string): Uint8Array | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

export function decodeBase64UrlJson(segment: string): Record<string, any> | null {
  try {
    const bytes = base64UrlDecodeBytes(segment);
    if (!bytes) return null;
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getJwtSecret(env?: Record<string, any>): string {
  const fromEnv =
    env?.JWT_SECRET ||
    (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined);
  if (fromEnv && String(fromEnv).trim().length >= 16) {
    return String(fromEnv).trim();
  }
  if (!runtimeJwtSecret) {
    const rand = new Uint8Array(32);
    crypto.getRandomValues(rand);
    runtimeJwtSecret = bytesToHex(rand);
  }
  return runtimeJwtSecret;
}

export function getInternalServiceKey(env?: Record<string, any>): string {
  const fromEnv =
    env?.INTERNAL_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.INTERNAL_API_KEY : undefined);
  if (fromEnv && String(fromEnv).trim().length >= 12) {
    return String(fromEnv).trim();
  }
  if (!runtimeInternalKey) {
    const rand = new Uint8Array(32);
    crypto.getRandomValues(rand);
    runtimeInternalKey = bytesToHex(rand);
  }
  return runtimeInternalKey;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS
  );

  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  if (!iterations || iterations < 10_000 || !salt || !expected) {
    return false;
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expected.length * 8
  );

  return constantTimeEqual(new Uint8Array(derivedBits), expected);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SignedJwtPayload {
  sub: string;
  email: string;
  name?: string | null;
  role: UserRole;
  iss?: string;
  iat?: number;
  exp?: number;
}

export async function signAuthToken(
  payload: Omit<SignedJwtPayload, 'iat' | 'exp' | 'iss'>,
  env?: Record<string, any>,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const headerSegment = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const bodySegment = base64UrlEncodeJson({
    ...payload,
    iss: 'quizplatform-api',
    iat: now,
    exp: now + expiresInSeconds,
  });

  const signingInput = `${headerSegment}.${bodySegment}`;
  const key = await importHmacKey(getJwtSecret(env));
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

export async function verifySignedJwt(
  token: string,
  env?: Record<string, any>
): Promise<SignedJwtPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson(headerSeg);
  if (!header || header.alg !== 'HS256') return null;

  const sigBytes = base64UrlDecodeBytes(sigSeg);
  if (!sigBytes) return null;

  try {
    const key = await importHmacKey(getJwtSecret(env));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
    );
    if (!valid) return null;

    const claims = decodeBase64UrlJson(payloadSeg);
    if (!claims || typeof claims.sub !== 'string' || !claims.sub) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === 'number' && claims.exp < now) {
      return null;
    }

    const role = VALID_ROLES.includes(claims.role) ? (claims.role as UserRole) : 'USER';
    return {
      sub: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : '',
      name: typeof claims.name === 'string' ? claims.name : null,
      role,
      iss: claims.iss,
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

export interface ResolvedAuthIdentity {
  userId: string;
  email?: string;
  name?: string;
  role?: UserRole;
  authMethod: 'jwt' | 'clerk_jwt';
}

const DEFAULT_CLERK_ISSUER = 'https://innocent-burro-9621.clerk.accounts.dev';
const jwksCache = new Map<string, { keys: any[]; fetchedAt: number }>();
const JWKS_TTL_MS = 10 * 60 * 1000;

function getAllowedClerkIssuer(env?: Record<string, any>): string {
  const configured =
    env?.CLERK_ISSUER ||
    (typeof process !== 'undefined' ? process.env?.CLERK_ISSUER : undefined);
  if (configured && /^https:\/\/[a-z0-9.-]+$/i.test(String(configured).trim())) {
    return String(configured).trim().replace(/\/+$/, '');
  }
  return DEFAULT_CLERK_ISSUER;
}

async function fetchClerkJwks(issuer: string): Promise<any[]> {
  const cached = jwksCache.get(issuer);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }

  const res = await fetch(`${issuer}/.well-known/jwks.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as { keys?: any[] } | null;
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  jwksCache.set(issuer, { keys, fetchedAt: Date.now() });
  return keys;
}

async function verifyClerkRs256Jwt(
  token: string,
  env?: Record<string, any>
): Promise<ResolvedAuthIdentity | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson(headerSeg);
  const claims = decodeBase64UrlJson(payloadSeg);
  if (
    !header ||
    header.alg !== 'RS256' ||
    !claims ||
    typeof claims.sub !== 'string' ||
    !claims.sub.startsWith('user_')
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === 'number' && claims.exp < now) {
    return null;
  }
  if (typeof claims.nbf === 'number' && claims.nbf > now + 60) {
    return null;
  }

  const allowedIssuer = getAllowedClerkIssuer(env);
  const tokenIssuer = typeof claims.iss === 'string' ? claims.iss.replace(/\/+$/, '') : '';
  if (tokenIssuer !== allowedIssuer) {
    return null;
  }

  const sigBytes = base64UrlDecodeBytes(sigSeg);
  if (!sigBytes) return null;

  try {
    const keys = await fetchClerkJwks(allowedIssuer);
    const matchingKey =
      (header.kid ? keys.find((k) => k.kid === header.kid) : null) ||
      keys.find((k) => k.kty === 'RSA');
    if (!matchingKey) return null;

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sigBytes as unknown as BufferSource,
      new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
    );
    if (!valid) return null;

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
      userId: claims.sub,
      email:
        claims.email ||
        claims.primary_email_address ||
        claims.email_address,
      name: fullName,
      role: VALID_ROLES.includes(claimRole) ? (claimRole as UserRole) : undefined,
      authMethod: 'clerk_jwt',
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a Bearer token issued by this API (HS256 JWT) or a Clerk RS256 session JWT via JWKS.
 */
export async function resolveBearerIdentity(
  token?: string,
  env?: Record<string, any>
): Promise<ResolvedAuthIdentity | null> {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  // 1. Cryptographically verify HS256 JWT issued by /auth/register or /auth/login
  const verified = await verifySignedJwt(trimmed, env);
  if (verified) {
    return {
      userId: verified.sub,
      email: verified.email,
      name: verified.name || undefined,
      role: verified.role,
      authMethod: 'jwt',
    };
  }

  // 2. Cryptographically verify Clerk RS256 session JWT against allowlisted Clerk JWKS
  return verifyClerkRs256Jwt(trimmed, env);
}
