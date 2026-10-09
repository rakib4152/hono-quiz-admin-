# Monorepo Repository Structure

The platform is organized as a production-grade TypeScript monorepo using pnpm/npm workspaces:

```
quiz-platform/
├── .env.example                               # Root environment definitions (no secrets)
├── package.json                               # Workspace root scripts & dependencies
├── tsconfig.json                              # Root TypeScript configuration
│
├── apps/
│   ├── api/                                   # Cloudflare Workers + Hono + Prisma Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma                  # Prisma Schema (MySQL InnoDB)
│   │   │   └── seed.ts                        # Seed runner for catalog & admin accounts
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── client.ts                  # Workers Prisma Client + Driver Adapter factory
│   │   │   ├── env.ts                         # Cloudflare Worker environment & Hyperdrive bindings
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                    # JWT / Bearer token validation
│   │   │   │   ├── cors.ts                    # CORS configuration
│   │   │   │   ├── logger.ts                  # Structured JSON logger & request IDs
│   │   │   │   └── rate-limiter.ts            # Workers KV sliding window rate limiter
│   │   │   ├── routes/
│   │   │   │   ├── health.ts                  # /health, /ready, /version
│   │   │   │   └── poc.ts                     # Phase 1 Database & Hyperdrive Connectivity PoC
│   │   │   ├── modules/                       # Domain business modules (Phases 3-6)
│   │   │   │   ├── auth/
│   │   │   │   ├── catalog/
│   │   │   │   ├── quizzes/
│   │   │   │   ├── attempts/
│   │   │   │   ├── scoring/
│   │   │   │   ├── payments/
│   │   │   │   └── offline/
│   │   │   └── index.ts                       # Hono application root (/api/v1)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── wrangler.jsonc                     # Cloudflare Worker configuration & Hyperdrive bindings
│   │
│   ├── web/                                   # Next.js 15 Admin Portal & Web App
│   │   ├── app/                               # Next.js App Router (dashboard, quizzes, users)
│   │   ├── components/                        # UI components (Tailwind + shadcn/ui)
│   │   ├── lib/                               # API client (typed calls to Cloudflare Worker)
│   │   ├── next.config.mjs                    # Next.js configuration (supports static export / standalone)
│   │   └── package.json
│   │
│   └── mobile/                                # Expo React Native Mobile App
│       ├── app/                               # Expo Router screens
│       ├── src/
│       │   ├── database/                      # Local SQLite schema & migrations
│       │   ├── offline/                       # Offline sync engine & idempotency queue
│       │   └── api/                           # Typed API client calling Worker
│       └── package.json
│
├── packages/
│   └── contracts/                             # Shared TypeScript types & Zod validation schemas
│       ├── src/
│       │   ├── index.ts                       # Shared DTOs, Enums, Zod Schemas
│       │   ├── auth.dto.ts
│       │   ├── quiz.dto.ts
│       │   ├── attempt.dto.ts
│       │   └── sync.dto.ts
│       ├── package.json
│       └── tsconfig.json
│
└── docs/
    ├── architecture.md                        # Complete Architecture & System Topology
    ├── compatibility-report.md                # Prisma + MySQL Adapter + Workers Compatibility
    ├── hostinger-checklist.md                 # Remote MySQL & Next.js Runtime Readiness Checklist
    └── repository-structure.md                # This directory guide
```
