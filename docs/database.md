# Database-per-Service Architecture & Hostinger MySQL Design

## 1. Overview
In accordance with strict microservices principles:
- **Zero cross-database foreign keys**: Foreign entities are held as scalar string fields (`VarChar(30)` matching cuid IDs).
- **Independent database ownership**: Each service owns its database, migrations, and connection pool.
- **Hosting Provider**: Hostinger Business shared hosting MySQL 8.0.x InnoDB.

---

## 2. Microservice Database Ownership Matrix

| Microservice | Target Database | Models Owned | Cross-Service Identifiers Stored |
| :--- | :--- | :--- | :--- |
| **Auth Service** | `auth_db` | `User`, `Session`, `Device` | None (Source of Identity) |
| **Quiz Content Service** | `quiz_db` | `Category`, `Exam`, `Subject`, `Topic`, `Quiz`, `Question`, `Option`, `QuizQuestion` | None (Source of Content) |
| **Quiz Attempt Service** | `attempt_db` | `QuizAttempt`, `AttemptAnswer`, `Bookmark`, `SavedQuiz`, `OfflineSync` | `userId` (from `auth_db`), `quizId` (from `quiz_db`), `questionId` (from `quiz_db`), `selectedOptionId` (from `quiz_db`) |
| **Payment Service** | `payment_db` | `Order`, `Payment`, `QuizAccess` | `userId` (from `auth_db`), `quizId` (from `quiz_db`) |
| **Analytics Service** | `analytics_db` | `Badge`, `UserBadge`, `LeaderboardEntry` | `userId` (from `auth_db`), `quizId` (from `quiz_db`) |

---

## 3. Hostinger Business Shared Hosting Connection Limits & Mitigation

### Constraints:
1. **`max_user_connections`**: Typically 30 to 50 concurrent connections per cPanel/hPanel MySQL user.
2. **5 Separate Databases**: Hostinger Business plans allow up to 100 MySQL databases.
3. **Traffic Target**: 5,000 simultaneous quiz takers.

### Microservices Mitigation Strategy:
- **Cloudflare Hyperdrive Multiplexing**: Instead of 5,000 workers creating direct TCP handshakes, Cloudflare Hyperdrive maintains a small, warm connection pool (10-15 persistent connections per service database).
- **Short-Lived Transactions**: Answer saving and attempt submission queries are executed in isolated, indexed transactions (< 15ms duration) preventing row-lock contention.
- **Read Caching**: Catalog data (Categories, Exams, Quiz structure) is cached at the edge or in Cloudflare KV with TTL invalidation on admin edits.
- **Migration Isolation**: Each service runs its own migrations independently:
  ```bash
  npx prisma migrate deploy --schema=./prisma/auth/schema.prisma
  npx prisma migrate deploy --schema=./prisma/quiz/schema.prisma
  npx prisma migrate deploy --schema=./prisma/attempt/schema.prisma
  npx prisma migrate deploy --schema=./prisma/payment/schema.prisma
  npx prisma migrate deploy --schema=./prisma/analytics/schema.prisma
  ```
