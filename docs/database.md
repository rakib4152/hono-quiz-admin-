# Database Architecture & Hostinger MySQL Design (Drizzle ORM)

## 1. Overview
In accordance with strict microservices principles:
- **Zero cross-database foreign keys**: Foreign entities are held as scalar string fields (`varchar(30)`).
- **Type-safe schema**: Powered by **Drizzle ORM** with MySQL dialect (`drizzle-orm/mysql-core`).
- **Hosting Provider**: Hostinger Business shared hosting MySQL 8.0.x InnoDB (`u427015050_drizzle`).
- **Driver**: `mysql2/promise` with Cloudflare Workers V8 compatibility (`disableEval: true`).

---

## 2. Microservice Database Ownership Matrix

| Microservice | Target Database | Models Owned | Cross-Service Identifiers Stored |
| :--- | :--- | :--- | :--- |
| **Auth Service** | `auth_db` | `users`, `sessions`, `devices` | None (Source of Identity) |
| **Quiz Content Service** | `quiz_db` | `categories`, `exams`, `subjects`, `topics`, `quizzes`, `questions`, `options`, `quizQuestions` | None (Source of Content) |
| **Quiz Attempt Service** | `attempt_db` | `attempts`, `attemptAnswers`, `bookmarks`, `savedQuizzes` | `userId`, `quizId`, `questionId`, `selectedOptionId` |
| **Payment Service** | `payment_db` | `orders`, `payments`, `quizAccess` | `userId`, `quizId` |
| **Analytics Service** | `analytics_db` | `badges`, `userBadges`, `leaderboardEntries` | `userId`, `quizId` |

---

## 3. Hostinger Shared Hosting Connection Limits & Mitigation

### Constraints:
1. **`max_user_connections`**: Typically 30 to 50 concurrent connections per cPanel/hPanel MySQL user.
2. **Traffic Target**: 5,000 simultaneous quiz takers.

### Microservices Mitigation Strategy:
- **Cloudflare Hyperdrive Multiplexing**: Instead of 5,000 workers creating direct TCP handshakes, Cloudflare Hyperdrive maintains a small, warm connection pool (10-15 persistent connections).
- **Short-Lived Transactions**: Answer saving and attempt submission queries are executed in isolated, indexed transactions (< 15ms duration) preventing row-lock contention.
- **Read Caching**: Catalog data (Categories, Exams, Quiz structure) is cached at the edge or in Cloudflare KV with TTL invalidation on admin edits.
- **Drizzle Kit Migration Execution**:
  ```bash
  # Generate Drizzle migration SQL files
  npx drizzle-kit generate

  # Push schema directly to Hostinger MySQL
  npx drizzle-kit push
  ```
