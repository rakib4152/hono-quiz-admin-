---
name: cloudflare-workers-hono-drizzle-hyperdrive
description: Complete architecture, edge patterns, Drizzle ORM integration, Hono API Gateway sub-routing, and Cloudflare Hyperdrive connection pooling for remote Hostinger MySQL on Cloudflare Workers.
---

# Cloudflare Workers + Hono + Drizzle ORM + Hyperdrive Skill Guide

This skill guide provides the authoritative architecture patterns, runtime configurations, and troubleshooting guidelines for developing scalable microservices on Cloudflare Workers using Hono and Drizzle ORM connected to remote MySQL via Cloudflare Hyperdrive.

---

## 1. System Architecture Overview

```
                          ┌──────────────────────────────────────┐
                          │   Client (Web / Mobile / CLI)       │
                          └──────────────────┬───────────────────┘
                                             │ HTTPS
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Cloudflare Workers: Edge API Gateway      │
                      │             (apps/src/index.ts)              │
                      │                                              │
                      │ - Dynamic Single-Origin CORS                 │
                      │ - Request Correlation ID (X-Correlation-ID)  │
                      │ - Drizzle DB Client Lazy Injection           │
                      │ - Global Error & 404 Handlers                │
                      └──────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  Auth Microservice   │  │  Quiz Microservice   │  │ Attempt Microservice │
│  (services/auth)     │  │  (services/quiz)     │  │  (services/attempt)  │
│                      │  │  * Native Hono App   │  │                      │
│ - Users & Sessions   │  │ - Categories & Exams │  │ - Candidate Attempts │
│ - RBAC (Admin/User)  │  │ - Quizzes & Questions│  │ - Server-Side Scoring│
└──────────────────────┘  └──────────┬───────────┘  └──────────────────────┘
                                     │
                                     ▼
                   ┌──────────────────────────────────┐
                   │   Cloudflare Hyperdrive Proxy    │
                   │  (c.env.HYPERDRIVE Connection)   │
                   │  Accelerated TCP & Pool Pooling  │
                   └─────────────────┬────────────────┘
                                     │ Direct TCP Socket (SSL)
                                     ▼
                   ┌──────────────────────────────────┐
                   │    Hostinger Remote MySQL 8.0    │
                   │      Database: u427015050_quiz   │
                   └──────────────────────────────────┘
```

---

## 2. Resolving `TypeError: Cannot read properties of undefined (reading 'indexOf') at Hono3.getPath`

### The Problem
When routing requests in a microservices setup on Cloudflare Workers, Hono developers often encounter:
```text
TypeError: Cannot read properties of undefined (reading 'indexOf') at Hono3.getPath
```

### Root Cause
1. **Passing Non-Hono Objects to `app.route()`**:
   Hono's `app.route(prefix, subApp)` expects `subApp` to be an instance of `Hono`. When an object literal (e.g., `{ handle: async () => ... }`) or an un-instantiated function is passed, Hono attempts to inspect route definitions. Upon incoming requests, Hono fails to find valid route handlers and attempts to parse a non-existent or misaligned request object, triggering `getPath(request)` where `request` or `request.url` is `undefined`.
2. **Custom Fetch Wrapper Argument Mismatch**:
   Wrapping `app.fetch` inside `export default { async fetch(req, env, ctx) { return subApp.fetch(c) } }` where a Hono context `c` or invalid parameter is forwarded instead of a standard Fetch API `Request` object.

### The Solution: Native Hono Sub-Applications

#### Step 1: Sub-Service Definition (`services/quiz-service/src/index.ts`)
The microservice MUST instantiate its own `Hono` instance and export it:
```typescript
import { Hono } from 'hono';
import { createDrizzleClient, type DrizzleDB } from '@repo/database';

export type QuizServiceEnv = {
  Bindings: {
    HYPERDRIVE?: { connectionString: string };
    DATABASE_URL?: string;
  };
  Variables: {
    db?: DrizzleDB;
    correlationId?: string;
    userRole?: string;
  };
};

export const quizService = new Hono<QuizServiceEnv>();

// Define sub-routes directly
quizService.get('/categories', async (c) => {
  const db = c.get('db') || createDrizzleClient(c.env);
  const data = await db.query.categories.findMany();
  return c.json({ success: true, data });
});

quizService.post('/categories', async (c) => {
  const db = c.get('db') || createDrizzleClient(c.env);
  const body = await c.req.json();
  await db.insert(categories).values(body);
  return c.json({ success: true, data: body }, 201);
});

export default quizService;
```

#### Step 2: Gateway Mounting (`apps/src/index.ts`)
The API Gateway mounts the sub-service using `app.route()` and exports the gateway as default:
```typescript
import { Hono } from 'hono';
import { quizService } from '../../services/quiz-service/src/index.js';
import { createDrizzleClient } from '@repo/database';

export const app = new Hono<{
  Bindings: Env;
  Variables: { db: DrizzleDB; correlationId: string };
}>();

// 1. Correlation ID & DB Client Injection Middleware
app.use('*', async (c, next) => {
  const correlationId = c.req.header('X-Correlation-ID') || crypto.randomUUID();
  c.set('correlationId', correlationId);
  try {
    c.set('db', createDrizzleClient(c.env));
  } catch (err) {
    console.warn('DB Init error:', err);
  }
  await next();
  c.res.headers.set('X-Correlation-ID', correlationId);
});

// 2. Mount Sub-Service
app.route('/api/v1', quizService);

// 3. Native Cloudflare Workers Export
export default app;
```

---

## 3. Database Layer: Drizzle ORM + Cloudflare Hyperdrive

### Why Drizzle ORM on Cloudflare Workers?
Prisma ORM generates heavy Rust binaries / query engines that are not natively compatible with serverless edge environments without Prisma Accelerate or complex driver adapters. Drizzle ORM is lightweight, pure TypeScript, and natively uses TCP sockets through `mysql2/promise` with zero edge binary restrictions.

### Client Factory (`packages/database/src/index.ts`)
```typescript
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

export function createDrizzleClient(env?: any): MySql2Database<typeof schema> {
  // 1. Prioritize Cloudflare Hyperdrive accelerated connection
  if (env?.HYPERDRIVE?.connectionString) {
    const pool = mysql.createPool({
      uri: env.HYPERDRIVE.connectionString,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
    });
    return drizzle(pool, { schema, mode: 'default' });
  }

  // 2. Direct remote MySQL fallback
  const url = env?.DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Database connection URL not configured.');
  }

  const pool = mysql.createPool({
    uri: url,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
  });
  return drizzle(pool, { schema, mode: 'default' });
}
```

### Cloudflare Worker Configuration (`wrangler.jsonc`)
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "quiz-platform-api",
  "main": "apps/src/index.ts",
  "compatibility_date": "2024-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "u427015050_quiz_hyperdrive_id"
    }
  ],
  "vars": {
    "ENVIRONMENT": "production",
    "API_VERSION": "v1",
    "CORS_ALLOWED_ORIGINS": "https://quiz.example.com,http://localhost:3000"
  }
}
```

---

## 4. Strict Persistence & Error Handling Guidelines

1. **No In-Memory Mock Fallbacks for State Mutations**:
   All write operations (`POST`, `PUT`, `PATCH`, `DELETE`) must execute against MySQL. If the database is unreachable, return a structured `HTTP 500` error with diagnostic guidance.
2. **Error Code Standardization**:
   - `ER_DUP_ENTRY` / `1062` -> `HTTP 409 Conflict` (Duplicate email or slug)
   - `ER_NO_REFERENCED_ROW_2` / `1452` -> `HTTP 400 Bad Request` (Invalid foreign key)
   - `ECONNREFUSED` / `ETIMEDOUT` -> `HTTP 500 Internal Server Error` (Hostinger remote MySQL whitelist required)
3. **Dynamic CORS Matching**:
   Always reflect a single matching origin header in `Access-Control-Allow-Origin`. Never return a comma-separated list of origins, which browsers reject.

---

## 5. Development & Deployment Runbook

```bash
# 1. Check TypeScript types
npm run lint

# 2. Run local development with Wrangler
npx wrangler dev

# 3. Generate Drizzle migration files
npx drizzle-kit generate

# 4. Push schema directly to Hostinger MySQL
npx drizzle-kit push

# 5. Deploy API Worker to Cloudflare Edge
npx wrangler deploy
```
