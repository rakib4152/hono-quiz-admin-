/**
 * Microservice: Payment Service
 * Database: Hostinger MySQL (orders, payments, quiz_access via Drizzle ORM) + memory store
 * Gateways: BKASH, NAGAD, SSLCOMMERZ, AAMARPAY
 * Responsibilities: Orders, payment verification, idempotent webhooks, QuizAccess grants
 */

import { OrderStatus, PaymentStatus } from '../../../packages/shared-types/src/index.js';
import {
  orders as ordersTable,
  payments as paymentsTable,
  quizAccess as quizAccessTable,
  quizzes as quizzesTable,
  createDrizzleClient,
  endDrizzleConnection,
  type DrizzleDB,
} from '../../../packages/database/src/index.js';
import { and, desc, eq } from 'drizzle-orm';

interface OrderEntity {
  id: string;
  userId: string;
  quizId: string;
  amount: number;
  currency: string;
  provider?: string;
  status: OrderStatus;
  idempotencyKey: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

interface PaymentEntity {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: Date;
  paidAt: Date | null;
}

interface QuizAccessEntity {
  id: string;
  userId: string;
  quizId: string;
  orderId: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
}

export const paymentDb = {
  orders: new Map<string, OrderEntity>(),
  payments: new Map<string, PaymentEntity>(),
  quizAccess: new Map<string, QuizAccessEntity>(),
};

function generateShortId(prefix: string): string {
  const rand = new Uint8Array(5);
  crypto.getRandomValues(rand);
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${Date.now().toString(36)}_${hex}`.slice(0, 30);
}

async function withOptionalDb<T>(
  env: any,
  fn: (db: DrizzleDB) => Promise<T>
): Promise<T | null> {
  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(env);
    return await fn(db);
  } catch (err) {
    console.warn('[payment-service] DB operation fell back to memory store:', (err as any)?.message || err);
    return null;
  } finally {
    if (db) {
      await endDrizzleConnection(db).catch(() => {});
    }
  }
}

export const paymentService = {
  async handle(req: {
    path: string;
    method: string;
    body?: any;
    correlationId: string;
    userId?: string;
    userRole?: string;
    env?: any;
  }) {
    const { path, method, body, correlationId, userId, userRole, env } = req;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // Inter-Service Internal Check: POST /internal/check-access
    if (path === '/internal/check-access' && method === 'POST') {
      const { userId: targetUserId, quizId: targetQuizId } = body || {};
      if (!targetUserId || !targetQuizId) {
        return { status: 400, data: { success: false, hasAccess: false, error: 'userId and quizId required', correlationId } };
      }

      const dbGrant = await withOptionalDb(env, async (db) => {
        const [row] = await db
          .select()
          .from(quizAccessTable)
          .where(and(eq(quizAccessTable.userId, targetUserId), eq(quizAccessTable.quizId, targetQuizId)))
          .limit(1);
        return row || null;
      });

      const memGrant = paymentDb.quizAccess.get(`${targetUserId}_${targetQuizId}`);
      const grant = dbGrant || memGrant || null;
      const hasAccess = Boolean(grant && (!grant.expiresAt || new Date(grant.expiresAt) > new Date()));

      return {
        status: 200,
        data: { success: true, hasAccess, expiresAt: grant?.expiresAt || null, correlationId },
      };
    }

    // Webhook: POST /webhooks/sslcommerz
    if (path === '/webhooks/sslcommerz' && method === 'POST') {
      const { tran_id, status } = body || {};
      let payment: PaymentEntity | undefined;
      for (const p of paymentDb.payments.values()) {
        if (p.providerReference === tran_id) {
          payment = p;
          break;
        }
      }
      if (!payment) {
        return { status: 404, data: { success: false, error: 'Payment not found', correlationId } };
      }

      if (payment.status === 'SUCCESS') {
        return { status: 200, data: { success: true, message: 'Already fulfilled', correlationId } };
      }

      if (status === 'VALID' || status === 'SUCCESS' || status === 'COMPLETED') {
        payment.status = 'SUCCESS';
        payment.paidAt = new Date();

        const order = paymentDb.orders.get(payment.orderId);
        if (order) {
          order.status = 'PAID';
          order.paidAt = new Date();

          const accessKey = `${order.userId}_${order.quizId}`;
          const grant: QuizAccessEntity = {
            id: generateShortId('acc'),
            userId: order.userId,
            quizId: order.quizId,
            orderId: order.id,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000 * 365),
          };
          paymentDb.quizAccess.set(accessKey, grant);

          await withOptionalDb(env, async (db) => {
            await db
              .update(ordersTable)
              .set({ status: 'PAID', paidAt: order.paidAt })
              .where(eq(ordersTable.id, order.id));
            await db
              .insert(quizAccessTable)
              .values(grant)
              .onDuplicateKeyUpdate({
                set: { orderId: grant.orderId, grantedAt: grant.grantedAt, expiresAt: grant.expiresAt },
              });
          });
        }
      }

      return { status: 200, data: { success: true, processed: true, correlationId } };
    }

    // All user-facing payment endpoints require authenticated userId
    if (!userId) {
      return {
        status: 401,
        data: { success: false, error: 'Authentication required (Bearer token missing or invalid)', correlationId },
      };
    }

    // =========================================================================
    // 1. CREATE PAID QUIZ ORDER (POST /orders)
    // =========================================================================
    if (path === '/orders' && method === 'POST') {
      const { quizId, amount, currency = 'BDT', provider = 'BKASH', idempotencyKey } = body || {};
      if (!quizId || typeof quizId !== 'string') {
        return { status: 400, data: { success: false, error: 'quizId is required', correlationId } };
      }

      const numericAmount = Number(amount);
      if (amount !== undefined && (!Number.isFinite(numericAmount) || numericAmount < 0)) {
        return { status: 400, data: { success: false, error: 'amount must be a valid non-negative number', correlationId } };
      }

      if (idempotencyKey) {
        for (const o of paymentDb.orders.values()) {
          if (o.idempotencyKey === idempotencyKey && o.userId === userId) {
            return { status: 200, data: { success: true, order: o, idempotent: true, correlationId } };
          }
        }
      }

      // Look up authoritative quiz price from DB when available
      const dbQuiz = await withOptionalDb(env, async (db) => {
        const [q] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
        return q || null;
      });
      const resolvedAmount =
        dbQuiz && Number(dbQuiz.price) > 0
          ? Number(dbQuiz.price)
          : Number.isFinite(numericAmount) && numericAmount > 0
            ? Math.round(numericAmount)
            : 100;

      const order: OrderEntity = {
        id: generateShortId('ord'),
        userId,
        quizId,
        amount: resolvedAmount,
        currency: String(currency || 'BDT').toUpperCase().slice(0, 3),
        provider: String(provider || 'BKASH').toUpperCase(),
        status: 'PENDING',
        idempotencyKey: idempotencyKey || null,
        createdAt: new Date(),
        paidAt: null,
      };
      paymentDb.orders.set(order.id, order);

      await withOptionalDb(env, async (db) => {
        await db.insert(ordersTable).values({
          id: order.id,
          userId: order.userId,
          quizId: order.quizId,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          idempotencyKey: order.idempotencyKey,
          createdAt: order.createdAt,
          paidAt: null,
        });
      });

      return { status: 201, data: { success: true, order, data: order, correlationId } };
    }

    // GET /orders - List orders for authenticated user (or all for admin)
    if (path === '/orders' && method === 'GET') {
      const dbOrders = await withOptionalDb(env, async (db) => {
        return isAdmin
          ? db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt))
          : db
              .select()
              .from(ordersTable)
              .where(eq(ordersTable.userId, userId))
              .orderBy(desc(ordersTable.createdAt));
      });

      const list =
        dbOrders ??
        Array.from(paymentDb.orders.values()).filter((o) => isAdmin || o.userId === userId);

      return { status: 200, data: { success: true, count: list.length, orders: list, data: list, correlationId } };
    }

    // =========================================================================
    // 2. INITIATE PAYMENT (POST /payments/initiate)
    // =========================================================================
    if (path === '/payments/initiate' && method === 'POST') {
      const { orderId, provider = 'SSLCOMMERZ' } = body || {};
      if (!orderId) {
        return { status: 400, data: { success: false, error: 'orderId is required', correlationId } };
      }

      let order = paymentDb.orders.get(orderId) || null;
      if (!order) {
        const dbOrder = await withOptionalDb(env, async (db) => {
          const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
          return row || null;
        });
        if (dbOrder) {
          order = {
            id: dbOrder.id,
            userId: dbOrder.userId,
            quizId: dbOrder.quizId,
            amount: dbOrder.amount,
            currency: dbOrder.currency,
            status: dbOrder.status as OrderStatus,
            idempotencyKey: dbOrder.idempotencyKey,
            createdAt: dbOrder.createdAt,
            paidAt: dbOrder.paidAt,
          };
          paymentDb.orders.set(order.id, order);
        }
      }

      if (!order) {
        return { status: 404, data: { success: false, error: 'Order not found', correlationId } };
      }
      if (order.userId !== userId && !isAdmin) {
        return { status: 403, data: { success: false, error: 'Forbidden: Order belongs to another user', correlationId } };
      }

      const normalizedProvider = String(provider || 'SSLCOMMERZ').toUpperCase();
      const providerRef = `${normalizedProvider}_TXN_${Date.now()}`;
      const payment: PaymentEntity = {
        id: generateShortId('pay'),
        orderId: order.id,
        provider: normalizedProvider,
        providerReference: providerRef,
        status: 'PENDING',
        amount: order.amount,
        currency: order.currency,
        createdAt: new Date(),
        paidAt: null,
      };
      paymentDb.payments.set(payment.id, payment);

      await withOptionalDb(env, async (db) => {
        await db.insert(paymentsTable).values(payment);
      });

      return {
        status: 200,
        data: {
          success: true,
          payment,
          gatewayRedirectUrl:
            normalizedProvider === 'SSLCOMMERZ'
              ? `https://sandbox.sslcommerz.com/gwprocess/v4/simulator.php?txn=${providerRef}`
              : `https://sandbox.aamarpay.com/paynow?txn=${providerRef}`,
          correlationId,
        },
      };
    }

    // =========================================================================
    // 3. VERIFY PAYMENT & UNLOCK QUIZ ACCESS (POST /payments/verify)
    //    Payload: { orderId, paymentId, status: "COMPLETED" | "VALID" | "SUCCESS", provider? }
    // =========================================================================
    if (path === '/payments/verify' && method === 'POST') {
      const { orderId, paymentId, status = 'COMPLETED', provider } = body || {};
      if (!orderId || typeof orderId !== 'string') {
        return { status: 400, data: { success: false, error: 'orderId is required', correlationId } };
      }

      let order = paymentDb.orders.get(orderId) || null;
      if (!order) {
        const dbOrder = await withOptionalDb(env, async (db) => {
          const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
          return row || null;
        });
        if (dbOrder) {
          order = {
            id: dbOrder.id,
            userId: dbOrder.userId,
            quizId: dbOrder.quizId,
            amount: dbOrder.amount,
            currency: dbOrder.currency,
            status: dbOrder.status as OrderStatus,
            idempotencyKey: dbOrder.idempotencyKey,
            createdAt: dbOrder.createdAt,
            paidAt: dbOrder.paidAt,
          };
          paymentDb.orders.set(order.id, order);
        }
      }

      if (!order) {
        return { status: 404, data: { success: false, error: 'Order not found', correlationId } };
      }
      if (order.userId !== userId && !isAdmin) {
        return { status: 403, data: { success: false, error: 'Forbidden: Order belongs to another user', correlationId } };
      }

      const normalizedStatus = String(status).toUpperCase();
      const isCompleted = ['COMPLETED', 'SUCCESS', 'VALID', 'PAID'].includes(normalizedStatus);
      const now = new Date();
      const resolvedPaymentId =
        typeof paymentId === 'string' && paymentId.trim() ? paymentId.trim().slice(0, 30) : generateShortId('pay');

      const paymentRecord: PaymentEntity = {
        id: resolvedPaymentId,
        orderId: order.id,
        provider: String(provider || order.provider || 'BKASH').toUpperCase(),
        providerReference: typeof paymentId === 'string' && paymentId.trim() ? paymentId.trim() : `TXN_${Date.now()}`,
        status: isCompleted ? 'SUCCESS' : 'FAILED',
        amount: order.amount,
        currency: order.currency,
        createdAt: now,
        paidAt: isCompleted ? now : null,
      };
      paymentDb.payments.set(paymentRecord.id, paymentRecord);

      let grant: QuizAccessEntity | null = null;
      if (isCompleted) {
        order.status = 'PAID';
        order.paidAt = now;
        paymentDb.orders.set(order.id, order);

        grant = {
          id: generateShortId('acc'),
          userId: order.userId,
          quizId: order.quizId,
          orderId: order.id,
          grantedAt: now,
          expiresAt: new Date(now.getTime() + 86400000 * 365),
        };
        paymentDb.quizAccess.set(`${order.userId}_${order.quizId}`, grant);
      }

      await withOptionalDb(env, async (db) => {
        await db
          .insert(paymentsTable)
          .values(paymentRecord)
          .onDuplicateKeyUpdate({
            set: { status: paymentRecord.status, paidAt: paymentRecord.paidAt },
          });

        if (isCompleted && grant) {
          await db
            .update(ordersTable)
            .set({ status: 'PAID', paidAt: now })
            .where(eq(ordersTable.id, order!.id));

          await db
            .insert(quizAccessTable)
            .values(grant)
            .onDuplicateKeyUpdate({
              set: { orderId: grant.orderId, grantedAt: grant.grantedAt, expiresAt: grant.expiresAt },
            });
        }
      });

      return {
        status: 200,
        data: {
          success: true,
          verified: isCompleted,
          status: isCompleted ? 'PAID' : 'FAILED',
          order,
          payment: paymentRecord,
          accessGranted: Boolean(grant),
          quizAccess: grant,
          correlationId,
        },
      };
    }

    // =========================================================================
    // 4. CHECK QUIZ ACCESS STATUS (GET /quiz-access/:quizId)
    // =========================================================================
    const matchQuizAccess = path.match(/^\/quiz-access\/([^/]+)$/);
    if (matchQuizAccess && method === 'GET') {
      const quizId = matchQuizAccess[1];

      const dbState = await withOptionalDb(env, async (db) => {
        const [grantRow] = await db
          .select()
          .from(quizAccessTable)
          .where(and(eq(quizAccessTable.userId, userId), eq(quizAccessTable.quizId, quizId)))
          .limit(1);
        const [quizRow] = await db
          .select()
          .from(quizzesTable)
          .where(eq(quizzesTable.id, quizId))
          .limit(1);
        return { grantRow: grantRow || null, quizRow: quizRow || null };
      });

      const grant = dbState?.grantRow || paymentDb.quizAccess.get(`${userId}_${quizId}`) || null;
      const isGrantActive = Boolean(grant && (!grant.expiresAt || new Date(grant.expiresAt) > new Date()));
      const isFreeQuiz = Boolean(dbState?.quizRow && Number(dbState.quizRow.price) === 0);
      const hasAccess = isGrantActive || isFreeQuiz || isAdmin;

      return {
        status: 200,
        data: {
          success: true,
          quizId,
          userId,
          hasAccess,
          reason: isGrantActive
            ? 'PURCHASED'
            : isFreeQuiz
              ? 'FREE_QUIZ'
              : isAdmin
                ? 'ADMIN_ACCESS'
                : 'PAYMENT_REQUIRED',
          price: dbState?.quizRow?.price ?? null,
          expiresAt: grant?.expiresAt || null,
          grant,
          correlationId,
        },
      };
    }

    // GET /quiz-access OR GET /users/me/quiz-access
    if ((path === '/quiz-access' || path === '/users/me/quiz-access') && method === 'GET') {
      const dbGrants = await withOptionalDb(env, async (db) => {
        return db.select().from(quizAccessTable).where(eq(quizAccessTable.userId, userId));
      });
      const grants =
        dbGrants ?? Array.from(paymentDb.quizAccess.values()).filter((a) => a.userId === userId);
      return {
        status: 200,
        data: { success: true, count: grants.length, grants, data: grants, correlationId },
      };
    }

    return { status: 404, data: { success: false, error: `Payment route '${path}' not found`, correlationId } };
  },
};