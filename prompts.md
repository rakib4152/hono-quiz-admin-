# Production Engineering Prompts Library
## Cloudflare Workers + Hono + Drizzle ORM + Cloudflare Hyperdrive + Hostinger MySQL

This document contains standardized, copy-paste prompts designed for extending, migrating, debugging, and scaling this project.

---

### Prompt 1: Scaffolding a New Hono Microservice with Gateway Mounting

```text
You are an expert full-stack engineer specializing in Hono, Cloudflare Workers, and Drizzle ORM.

Task:
Create a new microservice in `services/[service-name]` (e.g., `services/notification-service/src/index.ts`) and mount it to the API Gateway (`apps/src/index.ts`).

Requirements:
1. Export a native Hono sub-application instance (`export const serviceApp = new Hono<ServiceEnv>()`) so it seamlessly mounts using `app.route('/api/v1', serviceApp)`.
2. Do not use plain object literals with `{ handle: ... }` or custom request wrappers that trigger `TypeError: Cannot read properties of undefined (reading 'indexOf') at Hono3.getPath`.
3. Read the Drizzle database client from context (`c.get('db') || createDrizzleClient(c.env)`).
4. Provide standard routes with input validation and typed JSON responses:
   - GET /[resources]
   - POST /[resources]
   - GET /[resources]/:id
5. Mount the service in `apps/src/index.ts` using `app.route('/api/v1', serviceApp)`.
6. Ensure strict persistence (no silent in-memory fallbacks on write operations) and proper error code mapping (ER_DUP_ENTRY -> 409, ER_NO_REFERENCED_ROW_2 -> 400).
```

---

### Prompt 2: Extending Drizzle Schema & Synchronizing with Remote Hostinger MySQL

```text
You are an expert database engineer specializing in Drizzle ORM and MySQL.

Task:
Add new tables and relations to `packages/database/src/schema.ts` for [FEATURE_NAME], and provide the steps to generate and apply migrations to our remote Hostinger MySQL database (`u427015050_quiz`).

Requirements:
1. Use `mysqlTable`, `varchar`, `int`, `timestamp`, `text`, `boolean`, `double` from `drizzle-orm/mysql-core`.
2. Define primary keys (`id` varchar(36)), timestamps (`createdAt`, `updatedAt`), and relations using `relations()` from `drizzle-orm`.
3. Export all table schemas and type inferences (`typeof [table].$inferSelect`, `typeof [table].$inferInsert`) in `packages/database/src/schema.ts` and `packages/database/src/index.ts`.
4. Provide the exact commands to:
   - Generate migration SQL files: `npx drizzle-kit generate`
   - Apply schema to remote MySQL: `npx drizzle-kit push`
5. Verify that all relational queries work with `db.query.[table].findMany({ with: { ... } })`.
```

---

### Prompt 3: Diagnosing and Fixing `Hono3.getPath` / Route Dispatch Errors

```text
I am encountering the following runtime routing error in my Hono Cloudflare Workers app:
`TypeError: Cannot read properties of undefined (reading 'indexOf') at Hono3.getPath`

Context:
- API Gateway: `apps/src/index.ts`
- Microservice: `services/[service-name]/src/index.ts`

Please check and fix:
1. Ensure the microservice exports a native `new Hono()` instance rather than an object literal.
2. Verify that `app.route('/api/v1', subService)` is called with an authentic Hono instance.
3. Verify that the Cloudflare Workers export in `apps/src/index.ts` exports `export default app;` directly so standard Fetch `Request` objects are passed to `app.fetch(request, env, ctx)` without arguments being undefined.
4. Provide the exact updated code for both files.
```

---

### Prompt 4: Cloudflare Hyperdrive Connectivity Probe & Latency Benchmark

```text
Task:
Add a latency benchmarking and connectivity probe endpoint `/api/v1/poc/db-benchmark` to verify connection pooling efficiency through Cloudflare Hyperdrive vs direct TCP.

Requirements:
1. Measure cold-start connection latency vs warm-connection query latency executing `SELECT 1 + 1 AS ping, NOW() AS serverTime`.
2. Report Hyperdrive pool statistics, SSL handshake status, and database version info (`SELECT VERSION()`).
3. Return structured JSON with status 200 on success or status 500 with actionable Hostinger remote MySQL IP whitelist instructions on failure.
```

---

### Prompt 5: Offline Sync Protocol (SQLite to Remote MySQL)

```text
Task:
Implement the offline sync endpoint `POST /api/v1/sync/attempts` for mobile/PWA clients submitting offline quiz attempts stored in SQLite.

Requirements:
1. Accept batch submissions containing `clientAttemptId`, `quizId`, `answers`, `startedAt`, and `completedAt`.
2. Enforce idempotency: If `clientAttemptId` already exists in `attempts` table, return existing record without duplicate insertion.
3. Validate candidate answers against authoritative scoring keys fetched securely from the Quiz Service.
4. Atomically persist `QuizAttempt` and `AttemptAnswer` records using Drizzle ORM.
5. Return computed score, percentage, passed status, and server timestamp.
```

---

### Prompt 6: Role-Based Access Control (RBAC) & Protected Admin Middleware

```text
Task:
Create a reusable Hono middleware `requireRole(['ADMIN', 'SUPER_ADMIN'])` in `apps/src/middleware/auth.ts`.

Requirements:
1. Extract Bearer token from the `Authorization` header.
2. Verify token via internal `authService` or fast KV lookup (`c.env.CACHE_KV`).
3. Set `userId` and `userRole` into Hono context (`c.set('userId', user.id)`).
4. Return `401 Unauthorized` if token is missing/expired, or `403 Forbidden` if user role does not match required permissions.
5. Apply middleware to administrative routes (`POST /categories`, `POST /exams`, `POST /quizzes`, `POST /questions`).
```
