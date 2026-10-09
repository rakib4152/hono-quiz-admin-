# Microservices Architecture: Scalable Paid Quiz Platform

## 1. System Topology Diagram

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                                      CLIENTS                                                          |
|                                                                                                                       |
|   +------------------------------------+                                  +---------------------------------------+   |
|   |    Next.js 15 Web & Admin Panel    |                                  |   Expo React Native Mobile Client     |   |
|   |   (shadcn/ui, Tailwind CSS, TanStack)                                 |   - Local SQLite Schema & Sync Queue  |   |
|   +-----------------+------------------+                                  +-------------------+-------------------+   |
+---------------------|-------------------------------------------------------------------------|-----------------------+
                      | HTTPS (Bearer Token / Cookie)                                           | HTTPS (Bearer Token)
                      v                                                                         v
+-----------------------------------------------------------------------------------------------------------------------+
|                                             CLOUDFLARE API GATEWAY WORKER                                             |
|                                                                                                                       |
|   - Base Prefix: /api/v1/*                                                                                            |
|   - Correlation ID: X-Correlation-ID injection                                                                        |
|   - Authentication: Session token validation via auth-service                                                         |
|   - Rate Limiter: Sliding-window rate limiting per IP / User                                                          |
|   - OpenAPI 3.0: Public Swagger documentation endpoint                                                                |
+---------+--------------------+-------------------------+------------------------+-------------------+-----------------+
          |                    |                         |                        |                   |
          | HTTP (Internal)    | HTTP (Internal)         | HTTP (Internal)        | HTTP (Internal)   | HTTP (Internal)
          v                    v                         v                        v                   v
+------------------+ +------------------+      +-------------------+    +-------------------+ +-------------------+
|   AUTH SERVICE   | |   QUIZ CONTENT   |      |  ATTEMPT SERVICE  |    |  PAYMENT SERVICE  | | ANALYTICS SERVICE |
| (Cloudflare Wkr) | | (Cloudflare Wkr) |      | (Cloudflare Wkr)  |    | (Cloudflare Wkr)  | | (Cloudflare Wkr)  |
|                  | |                  |      |                   |    |                   | |                   |
| - Register/Login | | - Category/Exam  |      | - Timed Attempts  |    | - Orders (BDT)    | | - Leaderboards    |
| - Sessions/RBAC  | | - Subjects/Topic |      | - Scoring Engine  |    | - SSLCommerz      | | - User Badges     |
| - Devices        | | - Quizzes & Qs   |      | - Negative Marks  |    | - aamarPay        | | - Streaks/Points  |
| - Token Verify   | | - Offline Pkg    |      | - Offline Sync    |    | - QuizAccess      | | - Tie-breaking    |
+--------+---------+ +--------+---------+      +---------+---------+    +---------+---------+ +---------+---------+
         |                    |                          |                        |                     |
         | Hyperdrive Pool    | Hyperdrive Pool          | Hyperdrive Pool        | Hyperdrive Pool     | Hyperdrive Pool
         v                    v                          v                        v                     v
+------------------+ +------------------+      +-------------------+    +-------------------+ +-------------------+
|     auth_db      | |     quiz_db      |      |    attempt_db     |    |    payment_db     | |   analytics_db    |
| (Hostinger MySQL)| | (Hostinger MySQL)|      | (Hostinger MySQL) |    | (Hostinger MySQL) | | (Hostinger MySQL) |
+------------------+ +------------------+      +-------------------+    +-------------------+ +-------------------+
```

## 2. Inter-Service Communication Patterns

### A. Paid Quiz Attempt Workflow
1. Candidate issues `POST /api/v1/quizzes/:quizId/attempts` to API Gateway.
2. Gateway validates Bearer token with **Auth Service** (`/internal/verify-token`) and extracts `userId`.
3. Gateway dispatches request to **Attempt Service**.
4. **Attempt Service** calls **Quiz Content Service** (`POST /internal/quiz-scoring-keys`) to inspect question counts and whether `price > 0`.
5. If `price > 0`, **Attempt Service** calls **Payment Service** (`POST /internal/check-access` with `userId` and `quizId`).
6. If active unexpired `QuizAccess` exists, **Attempt Service** initializes `QuizAttempt` with `expiresAt = now + durationSeconds`.

### B. Transactional Server-Authoritative Scoring Workflow
1. Candidate issues `POST /api/v1/attempts/:attemptId/submit`.
2. **Attempt Service** queries **Quiz Content Service** (`POST /internal/quiz-scoring-keys`).
3. For each question:
   - Correct option selected: adds `question.marks` (e.g. `+1.0`).
   - Incorrect option selected: deducts `quiz.negativeMark` penalty (e.g. `-0.25`).
   - Unanswered: zero marks.
4. Attempt is marked `SUBMITTED` with final score, percentage, and accuracy.
5. **Eventual Consistency**: Attempt Service publishes an event / HTTP callback to **Analytics Service** (`POST /internal/record-attempt-result`) to recalculate leaderboards with deterministic tie-breaking (highest score, then earliest completed timestamp).
