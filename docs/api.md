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
  "password": "SecurePassword2026!"
}
```

---

## 2. Quiz Content Service (`quiz_db`)

### `GET /api/v1/quizzes/:quizId`
Returns quiz metadata along with ordered questions. Answer keys (`isCorrect`) are sanitized for candidate security unless called by an authorized Admin/Editor.

---

## 3. Attempt Service (`attempt_db`)

### `POST /api/v1/quizzes/:quizId/attempts`
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

### `PUT /api/v1/attempts/:attemptId/answers/:questionId`
**Request:**
```json
{
  "selectedOptionId": "opt_1a",
  "timeTakenSeconds": 24
}
```

### `POST /api/v1/attempts/:attemptId/submit`
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

---

## 4. Payment Service (`payment_db`)

### `POST /api/v1/orders`
Creates a pending order with `idempotencyKey` to prevent double billing.

### `POST /api/v1/webhooks/sslcommerz` & `POST /api/v1/webhooks/aamarpay`
Idempotent webhook processor that verifies transaction credentials and automatically creates a `QuizAccess` grant.

---

## 5. Offline Sync (`attempt_db`)

### `POST /api/v1/sync/push`
Payload pushed from Expo React Native SQLite store:
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
