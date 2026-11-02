# Production Deployment & CI/CD Guide (Drizzle ORM)

## 1. Hostinger Business Shared MySQL Setup

### Databases to Create in hPanel:
- `u427015050_drizzle` (Hostinger MySQL 8.0 InnoDB)

### Enable Remote MySQL:
In **hPanel -> Databases -> Remote MySQL**, add `%` (or Cloudflare Hyperdrive IP CIDRs).

### Drizzle ORM Schema Synchronization:
Run schema migrations from your development or CI/CD environment:
```bash
# 1. Generate SQL migration files
npx drizzle-kit generate

# 2. Push schema changes directly to remote Hostinger MySQL
npx drizzle-kit push

# 3. Seed initial database records
npx tsx src/db/seed.ts
```

---

## 2. Cloudflare Hyperdrive Setup
```bash
npx wrangler hyperdrive create quiz-hyperdrive --connection-string="mysql://u427015050_drizzlequiz:R.r.4152@srv1562.hstgr.io:3306/u427015050_drizzle"
```

---

## 3. Worker Services Deployment
```bash
npx wrangler deploy --config apps/wrangler.jsonc
```

---

## 4. Frontend & Mobile Integration
- **Admin Dashboard**: Connects to `/api/v1` (Cloudflare Workers API Gateway).
- **Mobile Client**: Communicates with `/api/v1` and caches offline attempts in SQLite, syncing batches via `POST /api/v1/sync/attempts`.
