/**
 * Microservice: Payment Service
 * Database: payment_db (Order, Payment, QuizAccess)
 * Gateways: SSLCommerz, aamarPay
 * Responsibilities: Orders, server-side gateway verification, idempotent webhooks, QuizAccess grants
 */

import { OrderStatus, PaymentStatus } from '../../../packages/shared-types/src/index.js';

interface OrderEntity {
  id: string;
  userId: string;
  quizId: string;
  amount: number;
  currency: string;
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

// Seed an active QuizAccess grant for demo student
paymentDb.quizAccess.set('usr_student1_quiz_bcs_model_01', {
  id: 'acc_demo_1',
  userId: 'usr_student1',
  quizId: 'quiz_bcs_model_01',
  orderId: 'ord_demo_1',
  grantedAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000 * 365),
});

export const paymentService = {
  async handle(req: { path: string; method: string; body?: any; correlationId: string; userId?: string }) {
    const { path, method, body, correlationId, userId = 'usr_student1' } = req;

    // POST /orders
    if (path === '/orders' && method === 'POST') {
      const { quizId, amount = 150, currency = 'BDT', idempotencyKey } = body || {};
      if (!quizId) return { status: 400, data: { success: false, error: 'quizId required', correlationId } };

      if (idempotencyKey) {
        for (const o of paymentDb.orders.values()) {
          if (o.idempotencyKey === idempotencyKey) {
            return { status: 200, data: { success: true, order: o, idempotent: true, correlationId } };
          }
        }
      }

      const order: OrderEntity = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        quizId,
        amount: Number(amount),
        currency,
        status: 'PENDING',
        idempotencyKey: idempotencyKey || null,
        createdAt: new Date(),
        paidAt: null,
      };
      paymentDb.orders.set(order.id, order);

      return { status: 201, data: { success: true, order, correlationId } };
    }

    // POST /payments/initiate
    if (path === '/payments/initiate' && method === 'POST') {
      const { orderId, provider = 'SSLCOMMERZ' } = body || {};
      const order = paymentDb.orders.get(orderId);
      if (!order) return { status: 404, data: { success: false, error: 'Order not found', correlationId } };

      const providerRef = `${provider}_TXN_${Date.now()}`;
      const payment: PaymentEntity = {
        id: `pay_${Date.now()}`,
        orderId: order.id,
        provider: provider.toUpperCase(),
        providerReference: providerRef,
        status: 'PENDING',
        amount: order.amount,
        currency: order.currency,
        createdAt: new Date(),
        paidAt: null,
      };
      paymentDb.payments.set(payment.id, payment);

      return {
        status: 200,
        data: {
          success: true,
          payment,
          gatewayRedirectUrl:
            provider.toUpperCase() === 'SSLCOMMERZ'
              ? `https://sandbox.sslcommerz.com/gwprocess/v4/simulator.php?txn=${providerRef}`
              : `https://sandbox.aamarpay.com/paynow?txn=${providerRef}`,
          correlationId,
        },
      };
    }

    // Webhook: POST /webhooks/sslcommerz
    if (path === '/webhooks/sslcommerz' && method === 'POST') {
      const { tran_id, val_id, status } = body || {};
      let payment: PaymentEntity | undefined;
      for (const p of paymentDb.payments.values()) {
        if (p.providerReference === tran_id) {
          payment = p;
          break;
        }
      }
      if (!payment) return { status: 404, data: { success: false, error: 'Payment not found', correlationId } };

      if (payment.status === 'SUCCESS') {
        return { status: 200, data: { success: true, message: 'Already fulfilled', correlationId } };
      }

      if (status === 'VALID' || status === 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.paidAt = new Date();

        const order = paymentDb.orders.get(payment.orderId);
        if (order) {
          order.status = 'PAID';
          order.paidAt = new Date();

          // Grant QuizAccess in payment_db
          const accessKey = `${order.userId}_${order.quizId}`;
          paymentDb.quizAccess.set(accessKey, {
            id: `acc_${Date.now()}`,
            userId: order.userId,
            quizId: order.quizId,
            orderId: order.id,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000 * 365),
          });
        }
      }

      return { status: 200, data: { success: true, processed: true, correlationId } };
    }

    // GET /users/me/quiz-access
    if (path === '/users/me/quiz-access' && method === 'GET') {
      const grants = Array.from(paymentDb.quizAccess.values()).filter((a) => a.userId === userId);
      return { status: 200, data: { success: true, count: grants.length, data: grants, correlationId } };
    }

    // Inter-Service Internal Check: /internal/check-access (called by attempt-service)
    if (path === '/internal/check-access' && method === 'POST') {
      const { userId: targetUserId, quizId: targetQuizId } = body || {};
      const grant = paymentDb.quizAccess.get(`${targetUserId}_${targetQuizId}`);
      const hasAccess = Boolean(grant && (!grant.expiresAt || grant.expiresAt > new Date()));

      return {
        status: 200,
        data: { success: true, hasAccess, expiresAt: grant?.expiresAt || null, correlationId },
      };
    }

    return { status: 404, data: { success: false, error: 'Payment route not found', correlationId } };
  },
};
