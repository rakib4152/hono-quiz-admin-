# Production Deployment & CI/CD Guide

## 1. Hostinger Business Shared MySQL Setup

### Databases to Create in hPanel:
1. `u123456_auth_db`
2. `u123456_quiz_db`
3. `u123456_attempt_db`
4. `u123456_payment_db`
5. `u123456_analytics_db`

### Enable Remote MySQL:
In **hPanel -> Databases -> Remote MySQL**, add `%` (or Cloudflare Hyperdrive IP CIDRs) for each database.

### Prisma Migration Execution:
Run independent migrations from deployment environment:
```bash
npx prisma migrate deploy --schema=./prisma/auth/schema.prisma
npx prisma migrate deploy --schema=./prisma/quiz/schema.prisma
npx prisma migrate deploy --schema=./prisma/attempt/schema.prisma
npx prisma migrate deploy --schema=./prisma/payment/schema.prisma
npx prisma migrate deploy --schema=./prisma/analytics/schema.prisma
```

---

## 2. Cloudflare Hyperdrive Setup
```bash
npx wrangler hyperdrive create auth-hyperdrive --connection-string="mysql://user:pass@host:3306/u123456_auth_db"
npx wrangler hyperdrive create quiz-hyperdrive --connection-string="mysql://user:pass@host:3306/u123456_quiz_db"
npx wrangler hyperdrive create attempt-hyperdrive --connection-string="mysql://user:pass@host:3306/u123456_attempt_db"
npx wrangler hyperdrive create payment-hyperdrive --connection-string="mysql://user:pass@host:3306/u123456_payment_db"
npx wrangler hyperdrive create analytics-hyperdrive --connection-string="mysql://user:pass@host:3306/u123456_analytics_db"
```

---

## 3. Worker Services Deployment
```bash
cd services/api-gateway && npx wrangler deploy
cd services/auth-service && npx wrangler deploy
cd services/quiz-service && npx wrangler deploy
cd services/attempt-service && npx wrangler deploy
cd services/payment-service && npx wrangler deploy
cd services/analytics-service && npx wrangler deploy
```

---

## 4. Next.js Admin & Expo Mobile Integration
- **Next.js Admin**: Configured with `output: 'export'` for Hostinger shared hosting or `output: 'standalone'` for Hostinger VPS, connecting to `https://api.example.com/api/v1`.
- **Expo Mobile Client**: Communicates with `https://api.example.com/api/v1` and caches offline attempts in SQLite, pushing batches to `POST /api/v1/sync/push`.
