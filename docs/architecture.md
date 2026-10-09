# Architecture Specification: Scalable Quiz Platform

## 1. System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENTS                                                  |
|                                                                                                   |
|   +------------------------------------+          +-------------------------------------------+   |
|   |   Next.js 15 Admin / Web Portal    |          |   Expo Mobile App (React Native + TS)     |   |
|   |   (Tailwind CSS, TanStack Query)   |          |   - Offline SQLite Cache & Sync Queue     |   |
|   |   Hosted: Hostinger VPS / Standalone|          |   - SecureStore for Tokens & Sessions     |   |
|   +-----------------+------------------+          +---------------------+---------------------+   |
+---------------------|---------------------------------------------------|-------------------------+
                      | HTTPS (JWT / Secure Cookie)                       | HTTPS (Bearer Token)
                      v                                                   v
+---------------------------------------------------------------------------------------------------+
|                                  CLOUDFLARE EDGE NETWORK                                          |
|                                                                                                   |
|   [ Cloudflare DNS + DDoS Protection + WAF + Turnstile Anti-Abuse (api.example.com) ]             |
|                                                     |                                             |
|                                                     v                                             |
|   +-------------------------------------------------------------------------------------------+   |
|   |                          CLOUDFLARE WORKERS (Hono Framework)                              |   |
|   |                                                                                           |   |
|   |   - Route Engine: Hono v4 (TypeScript, /api/v1 router)                                    |   |
|   |   - Middlewares: CORS, Request ID, Secure Auth, Rate Limiter, Zod Validation, OpenAPI     |   |
|   |   - Business Modules: Auth, Users, Catalog, Quizzes, Attempts, Scoring, Payments, Sync    |   |
|   |   - ORM: Prisma ORM with Workers MySQL Driver Adapter (`mariadb` / `mysql2`)              |   |
|   +----------+--------------------+--------------------+--------------------+-----------------+   |
|              |                    |                    |                    |                     |
|              v                    v                    v                    v                     |
|     +-----------------+  +-----------------+  +-----------------+  +------------------+           |
|     |  Cloudflare KV  |  |  Cloudflare R2  |  |Cloudflare Queues|  | Cloudflare       |           |
|     |  - Session Cache|  |  - Question Img |  |  - Async Scoring|  | HYPERDRIVE       |           |
|     |  - Rate Limits  |  |  - Media Assets |  |  - Batch Sync   |  | (Pooling & Proxy)|           |
|     |  - Token Revoke |  |  - CSV Exports  |  |  - Email Alerts |  +--------+---------+           |
|     +-----------------+  +-----------------+  +-----------------+           |                     |
+-----------------------------------------------------------------------------|---------------------+
                                                                              | Persistent TCP Pool
                                                                              | TLS 1.3 / Port 3306
                                                                              v
+---------------------------------------------------------------------------------------------------+
|                                    HOSTINGER INFRASTRUCTURE                                       |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   |                           Hostinger Remote MySQL Database                                 |   |
|   |   - Engine: MySQL 8.0.x InnoDB                                                            |   |
|   |   - Network: Port 3306 exposed strictly to Cloudflare Hyperdrive IP ranges / TLS required |   |
|   |   - Strict connection budgeting: max_user_connections managed by Hyperdrive pooling       |   |
|   |   - Storage: Persistent InnoDB tables with compound indexing, B-Trees, UTF8MB4 (Bangla)   |   |
|   +-------------------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

## 2. Ingress & Traffic Flow
1. **Client Request**: Next.js Web or Expo Mobile sends requests to `https://api.example.com/api/v1/*`.
2. **Edge Processing**: Cloudflare Edge handles TLS termination, DDoS filtering, Turnstile validation, and dispatches to the Hono Worker.
3. **Middleware Pipeline**: Hono executes Request ID generation, CORS allowlisting, rate limiting (KV-backed), and JWT authentication.
4. **Data Layer & Hyperdrive**:
   - The Worker accesses Prisma Client configured with the driver adapter.
   - Prisma forwards TCP SQL packets through `env.HYPERDRIVE.connectionString`.
   - Cloudflare Hyperdrive acts as an edge connection pooler, caching non-volatile query results and maintaining warm, persistent TLS connections to Hostinger MySQL (port 3306).
5. **Database Execution**: Hostinger MySQL processes queries within ACID transaction boundaries.
6. **Response / Asynchronous Offload**:
   - Critical path (e.g., answer recording, quiz submission) responds immediately with server timestamps.
   - Heavy background tasks (batch evaluation, leaderboard re-calculation, email notifications) are offloaded to Cloudflare Queues.
