# Application Security & Payment Fraud Prevention

## 1. Zero Trust Architecture
- Never trust user IDs, roles, marks, or payment statuses sent from client apps.
- All scores, percentages, and negative mark penalties are computed exclusively on the server in `attempt-service`.
- Question correct keys (`Option.isCorrect`) are sanitized from question payloads during candidate attempts and offline package downloads.

---

## 2. Payment Gateway Verification (SSLCommerz & aamarPay)
- Never fulfill orders based on client-reported success.
- Require server-to-server validation using the provider's validation API (`/validator/api/validationserver.php`).
- Idempotent order transitions: Webhook retries verify if `Payment.status === SUCCESS` and prevent double fulfillment.
- Automatic revocation: Chargebacks or refunds transition `Order.status = REFUNDED` and revoke `QuizAccess`.

---

## 3. Inter-Service Communication Security
- Internal service endpoints (e.g., `/internal/verify-token`, `/internal/quiz-scoring-keys`, `/internal/check-access`) are protected by Cloudflare Service Bindings or HMAC signature tokens with short timestamp TTLs (preventing replay attacks).
- External clients cannot access `/internal/*` routes through the API Gateway.
