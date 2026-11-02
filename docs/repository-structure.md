# Monorepo Repository Structure

The platform is organized as a production-grade TypeScript monorepo using npm workspaces:

```
quiz-platform/
├── .env.example                               # Root environment definitions (no secrets)
├── package.json                               # Workspace root scripts & dependencies (Drizzle ORM)
├── tsconfig.json                              # Root TypeScript configuration
├── drizzle.config.ts                          # Drizzle Kit configuration for Hostinger MySQL
│
├── apps/
│   └── src/                                   # Cloudflare Workers + Hono API Gateway
│       ├── index.ts                           # Gateway routing & dynamic CORS (/api/v1)
│       ├── env.ts                             # Cloudflare Worker environment & Hyperdrive bindings
│       ├── cors.ts                            # Single-origin dynamic CORS
│       └── routes/
│           ├── health.ts                      # /health and system diagnostics
│           └── poc.ts                         # Hostinger MySQL & Hyperdrive connectivity probe
│
├── packages/
│   ├── database/                              # Drizzle ORM Schema & Client Factory
│   │   ├── src/
│   │   │   ├── index.ts                       # createDrizzleClient, verifyDatabaseConnection
│   │   │   └── schema.ts                      # MySQL tables (categories, exams, quizzes, questions, etc.)
│   │   └── package.json
│   ├── contracts/                             # Shared TypeScript types & Zod validation schemas
│   │   └── src/index.ts
│   └── shared-types/                          # Common domain enums & models
│       └── src/index.ts
│
├── services/
│   ├── quiz-service/                          # Content Service (Categories, Exams, Quizzes, Questions)
│   ├── attempt-service/                       # Timed Attempts, Submissions, Scoring & Bookmarks
│   ├── auth-service/                          # Identity, JWT, and Device Management
│   ├── payment-service/                       # Orders, Payments & QuizAccess
│   └── analytics-service/                     # Leaderboards & Badges
│
├── src/                                       # Frontend Admin Dashboard (React + Tailwind)
│   ├── components/admin/                      # Admin pages, tables, editors
│   ├── db/seed.ts                             # Database seeder using Drizzle ORM
│   └── lib/api/client.ts                      # Typed API client
│
└── docs/
    ├── architecture.md                        # Complete Architecture & System Topology
    ├── database.md                            # Drizzle ORM + MySQL Schema Guide
    ├── deployment.md                          # Cloudflare Workers & Hyperdrive Deployment Guide
    ├── hostinger-checklist.md                 # Remote MySQL Readiness Checklist
    └── repository-structure.md                # This directory guide
```
