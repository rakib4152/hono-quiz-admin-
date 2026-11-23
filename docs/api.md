# REST API Specification: Microservices Endpoints (/api/v1)

All endpoints accept and return JSON. Requests include an `X-Correlation-ID` header.

---

## 1. Authentication Service (`auth_db`)

### `POST /api/v1/auth/register`
**Request:**
```json
{
  "name": "Candidate Aspirant",
  "email": "aspirant@example.com",
  "password": "SecurePassword2026!",
  "role": "USER"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "token": "tok_174209124_93fa8b",
  "user": {
    "id": "usr_9921",
    "name": "Candidate Aspirant",
    "email": "aspirant@example.com",
    "role": "USER"
  },
  "correlationId": "corr_8912384"
}
```

### `POST /api/v1/auth/login`
**Request:**
```json
{
  "email": "aspirant@example.com",
  "password": "SecurePassword2026!",
  "deviceName": "iPhone 15 Pro",
  "platform": "ios"
}
```

### `GET /api/v1/auth/me`
Returns the authenticated user profile resolved from either a signed HS256 JWT or a verified Clerk RS256 session token.

### `GET /api/v1/devices`, `POST /api/v1/devices/register`, `DELETE /api/v1/devices/:deviceId`
Manage multi-device sessions for the authenticated account.

---

## 2. Quiz Content Service (`quiz_db`)

### Topics & Chapters (Optional / Nullable Curriculum Hierarchy)

Topics and Chapters are both **nullable** across the catalog, quiz, and question models:
- `topics.subjectId` is **nullable** (standalone topics allowed).
- `chapters.topicId` and `chapters.subjectId` are **nullable** (standalone or subject-linked chapters allowed).
- `quizzes.topicId` and `quizzes.chapterId` are **nullable**.
- `questions.topicId` and `questions.chapterId` are **nullable**.

#### `GET /api/v1/topics` & `POST /api/v1/topics` & `PUT /api/v1/topics/:id` & `DELETE /api/v1/topics/:id`
**Create Request (`subjectId` optional/nullable):**
```json
{
  "subjectId": null,
  "name": "Algebra & Equations",
  "slug": "algebra-and-equations"
}
```

#### `GET /api/v1/chapters` & `POST /api/v1/chapters` & `PUT /api/v1/chapters/:id` & `DELETE /api/v1/chapters/:id`
Supports optional filtering via `?topicId=...` and `?subjectId=...`.
**Create Request (`topicId` and `subjectId` both optional/nullable):**
```json
{
  "topicId": null,
  "subjectId": "sub_math_01",
  "name": "Quadratic Equations",
  "slug": "quadratic-equations"
}
```

#### `GET /api/v1/quizzes`, `GET /api/v1/quizzes/:quizId`, `POST /api/v1/quizzes`, `PUT /api/v1/quizzes/:quizId`, `DELETE /api/v1/quizzes/:quizId`
Returns quiz metadata along with ordered questions (`GET /api/v1/quizzes/:quizId/questions` and `GET /api/v1/quizzes/:quizId/offline-package`). Answer keys (`isCorrect`) are sanitized for candidate security unless called by an authorized Admin/Super Admin.
**Create Quiz Request (`topicId` & `chapterId` optional/nullable):**
```json
{
  "title": "46th BCS Model Test 01",
  "categoryId": "cat_job_01",
  "examId": "exam_bcs_46",
  "topicId": null,
  "chapterId": null,
  "durationSeconds": 3600,
  "passPercentage": 50,
  "negativeMark": 0.25,
  "price": 0
}
```

#### `GET /api/v1/questions`, `POST /api/v1/questions`, `DELETE /api/v1/questions/:id`
**Create Question Request (`topicId` & `chapterId` optional/nullable):**
```json
{
  "subjectId": "sub_math_01",
  "topicId": null,
  "chapterId": null,
  "body": "What is the sum of internal angles of a hexagon?",
  "difficulty": "MEDIUM",
  "marks": 1,
  "options": [
    { "text": "720°", "isCorrect": true },
    { "text": "540°", "isCorrect": false },
    { "text": "360°", "isCorrect": false },
    { "text": "900°", "isCorrect": false }
  ]
}
```

---

## 3. Attempt, Bookmarks & Offline Sync Service (`attempt_db`)

### `POST /api/v1/quizzes/:quizId/start` (alias: `POST /api/v1/quizzes/:quizId/attempts`)
**Headers:** `Authorization: Bearer <token>`
**Response (201 Created):**
```json
{
  "success": true,
  "attemptId": "att_109283",
  "quizId": "quiz_bcs_model_01",
  "startedAt": "2026-10-09T10:00:00Z",
  "expiresAt": "2026-10-09T11:00:00Z",
  "totalQuestions": 200,
  "correlationId": "corr_91283"
}
```

### `POST /api/v1/attempts/:attemptId/answers` & `PUT /api/v1/attempts/:attemptId/answers/:questionId`
**Request:**
```json
{
  "questionId": "q_alg_01",
  "selectedOptionId": "opt_1a",
  "timeTakenSeconds": 24
}
```

### `POST /api/v1/attempts/:attemptId/submit` & `GET /api/v1/attempts/:attemptId`
Executes server-authoritative scoring and negative mark calculations.
**Response (200 OK):**
```json
{
  "success": true,
  "result": {
    "attemptId": "att_109283",
    "status": "SUBMITTED",
    "score": 154.25,
    "maxScore": 200,
    "percentage": 77.12,
    "correctCount": 162,
    "wrongCount": 31,
    "unansweredCount": 7,
    "timeTakenSeconds": 5420
  },
  "correlationId": "corr_91283"
}
```

### `GET /api/v1/bookmarks`, `POST /api/v1/bookmarks/toggle`, `GET /api/v1/saved-quizzes`, `POST /api/v1/saved-quizzes/toggle`
Toggle and list user-owned bookmarked questions and saved quizzes.

### `POST /api/v1/sync/attempts` & `POST /api/v1/sync/push`
Idempotent offline attempt synchronization from Expo React Native SQLite stores:
```json
{
  "syncKey": "sqlite_sync_uuid_1029384",
  "quizId": "quiz_bcs_model_01",
  "timeTakenSeconds": 3400,
  "answers": [
    { "questionId": "q_alg_01", "selectedOptionId": "opt_1a" },
    { "questionId": "q_alg_02", "selectedOptionId": "opt_2b" }
  ]
}
```

---

## 4. Payment & Access Service (`payment_db`)

- `POST /api/v1/orders` & `GET /api/v1/orders` — Create and list user orders (with `idempotencyKey`).
- `POST /api/v1/payments/initiate` & `POST /api/v1/payments/verify` — Initiate and verify payments, automatically unlocking `quiz_access`.
- `GET /api/v1/quiz-access` & `GET /api/v1/quiz-access/:quizId` — Verify active entitlements for a quiz.
- `POST /api/v1/webhooks/sslcommerz` & `POST /api/v1/webhooks/aamarpay` — Idempotent payment gateway webhooks.

---

## 5. Analytics & Leaderboards Service (`analytics_db`)

- `GET /api/v1/leaderboards/:quizId` (alias: `GET /api/v1/leaderboards/quizzes/:quizId`) — Ranked scores from submitted attempts.
- `GET /api/v1/badges` & `GET /api/v1/badges/my` — Catalog of achievement badges and badges earned by the authenticated user.
