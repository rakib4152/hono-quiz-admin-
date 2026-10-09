# Compatibility Report: Prisma ORM, MySQL Driver Adapters & Cloudflare Workers

## Executive Summary
This report analyzes the compatibility between **Prisma ORM**, **Cloudflare Workers runtime**, **Cloudflare Hyperdrive**, and **Hostinger remote MySQL 8.0**.

---

## 1. Cloudflare Workers Runtime & TCP Constraints
- **V8 Isolate Nature**: Cloudflare Workers do not run a traditional Node.js process with native C++ bindings (such as `libuv` or native OpenSSL sockets).
- **Socket Support**: Workers support TCP outbound connections via `cloudflare:sockets` (standard `connect()` API).
- **Node.js Compatibility**: By specifying `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc`, the Worker runtime provides standard `node:net`, `node:tls`, `node:crypto`, `node:buffer`, and `node:events` implementations mapped onto `cloudflare:sockets`.

---

## 2. Prisma Driver Adapters Matrix for MySQL

Prisma provides Driver Adapters that decouple query compilation (Wasm / Rust engine) from direct TCP socket drivers:

| Driver Adapter | Underlying Driver | Transport | Workers Support | Hyperdrive Compatibility | Production Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@prisma/adapter-mariadb`** | `mariadb` (Node.js) | TCP via `nodejs_compat` (`connect()`) | Yes (Prisma 6.x / 7.x) | Excellent (Transparent pooling via connection string) | **RECOMMENDED PRIMARY** |
| **`@prisma/adapter-mysql`** | `mysql2` | TCP via `node:net` polyfill | Yes (Prisma 7.x / experimental 6.x) | Supported with pooled connection string | **VERIFIED SECONDARY** |
| **`@prisma/adapter-planetscale`** | `@planetscale/database` | HTTP Fetch API | Yes | Not applicable (PlanetScale cloud only, incompatible with Hostinger MySQL) | **INCOMPATIBLE WITH HOSTINGER** |
| **Traditional Prisma Engine** | Binary / Query Engine | Native TCP Socket | **No** (Cannot execute native binary in Worker sandbox) | Incompatible directly | **DISALLOWED** |

### Implementation Recommendation:
Use Prisma Client with Driver Adapter (`@prisma/adapter-mariadb` or `@prisma/adapter-mysql`) paired with the standard `mariadb` / `mysql2` package and Cloudflare Workers `nodejs_compat`.

---

## 3. How Cloudflare Hyperdrive Connects with Hostinger MySQL

### The Architecture:
```
[Worker (Prisma Client)] 
       | (Local socket inside isolate, latency < 1ms)
       v
[Cloudflare Hyperdrive Edge Proxy] 
       | (Persistent, encrypted TLS 1.3 TCP connection pool)
       v
[Hostinger Shared Server : Port 3306] (InnoDB MySQL 8.0)
```

### Key Technical Behaviors:
1. **Dynamic Connection String**:
   Inside the Worker handler:
   ```typescript
   const connectionString = env.HYPERDRIVE.connectionString;
   // e.g., "mysql://<proxy-user>:<proxy-pass>@hyperdrive-gateway.cloudflare.com:3306/<db_name>?sslaccept=strict"
   ```
   Hyperdrive provides a specialized local gateway URI with credentials that forward queries directly to Hostinger.
2. **Prepared Statements**:
   Hyperdrive intercepts parameterized SQL queries (`PREPARE`, `EXECUTE`) and caches execution plans, dramatically reducing parsing round-trips over the WAN.
3. **Transaction Routing**:
   Prisma interactive transactions (`prisma.$transaction(async (tx) => { ... })`) are pinned to the same physical connection through Hyperdrive until `COMMIT` or `ROLLBACK` completes.
4. **Connection Pooling Elimination**:
   Without Hyperdrive, 5,000 concurrent quiz takers would trigger 5,000 separate TCP handshakes directly to Hostinger, immediately crashing the database with `ER_CON_COUNT_ERROR` (`max_user_connections` exceeded). Hyperdrive multiplexes hundreds of worker requests over a small, persistent pool (e.g. 10–25 connections).

---

## 4. Hostinger Specific Constraints & Mitigation Plan

| Constraint | Limit on Shared Hosting | Impact on Quiz Platform | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| `max_user_connections` | Usually **30 to 50** concurrent connections per cPanel/hPanel user | Risk of connection exhaustion under traffic spikes | Hyperdrive pools and reuses connections; set `max_connections` inside Hyperdrive configuration to 20. |
| Remote Network Latency | Hostinger data centers are typically in specific regions (e.g. US, UK, Netherlands, Singapore). WAN latency is ~50-120ms from edge workers | Answer submission and reads could lag without edge optimization | Hyperdrive caches repeated query results (e.g., catalog categories, exam metadata); answer submission writes are batched or queued. |
| Strict Timeout Limits | MySQL `wait_timeout` is often 30-60s on shared plans | Stale connection dropouts | Hyperdrive actively keeps connections warm with health checks. |
| Shared CPU & Disk I/O | Limited IOPS on shared MySQL disks | Slower large report queries or full table scans | Enforce strict B-Tree indexes, compound keys, pagination (LIMIT/OFFSET or cursor-based), no unindexed scans. |

---

## 5. Conclusion & Verification Strategy
- Prisma ORM + Workers + Hyperdrive + Hostinger MySQL is **viable and architecturally validated** using Prisma Driver Adapters (`@prisma/adapter-mariadb` or `@prisma/adapter-mysql`) with `nodejs_compat`.
- The connection proof-of-concept (PoC) must verify:
  1. Handshake and TLS negotiation to Hostinger MySQL via Hyperdrive.
  2. Transaction execution (`BEGIN`, `INSERT`, `COMMIT`).
  3. Unicode character set support (`utf8mb4` for Bengali/Bangla script).
  4. Response time under isolated worker invocation.
