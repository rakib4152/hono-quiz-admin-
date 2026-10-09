/**
 * Orders, Payments & QuizAccess Module
 * Models: Order, Payment, QuizAccess
 * Gateways: SSLCommerz, AamarPay
 */

import {
  dbStore,
  OrderRecord,
  PaymentRecord,
  QuizAccessRecord,
} from '../../services/store.js';

export function handlePaymentRoutes(path: string, method: string, body: any, query: URLSearchParams, headers: Headers) {
  const authHeader = headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let currentUserId = 'usr_student1';
  if (token) {
    for (const sess of dbStore.sessions.values()) {
      if (sess.tokenHash === token) {
        currentUserId = sess.userId;
        break;
      }
    }
  }

  // POST /orders
  if (path === '/orders' && method === 'POST') {
    const { quizId, idempotencyKey } = body || {};
    if (!quizId) return { status: 400, data: { success: false, error: 'quizId is required' } };

    const quiz = dbStore.quizzes.get(quizId);
    if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found' } };

    // Check idempotency
    if (idempotencyKey) {
      for (const ord of dbStore.orders.values()) {
        if (ord.idempotencyKey === idempotencyKey) {
          return { status: 200, data: { success: true, order: ord, idempotentReplay: true } };
        }
      }
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newOrder: OrderRecord = {
      id: orderId,
      userId: currentUserId,
      quizId: quiz.id,
      amount: quiz.price,
      currency: quiz.currency,
      status: 'PENDING',
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
      paidAt: null,
    };
    dbStore.orders.set(newOrder.id, newOrder);

    return { status: 201, data: { success: true, order: newOrder } };
  }

  // POST /payments/initialize
  if (path === '/payments/initialize' && method === 'POST') {
    const { orderId, provider = 'SSLCOMMERZ' } = body || {};
    if (!orderId) return { status: 400, data: { success: false, error: 'orderId is required' } };

    const order = dbStore.orders.get(orderId);
    if (!order) return { status: 404, data: { success: false, error: 'Order not found' } };

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paymentRecord: PaymentRecord = {
      id: paymentId,
      orderId: order.id,
      provider: provider.toUpperCase(),
      providerReference: `${provider.toUpperCase()}_TXN_${Date.now()}`,
      status: 'PENDING',
      amount: order.amount,
      currency: order.currency,
      createdAt: new Date(),
      paidAt: null,
    };
    dbStore.payments.set(paymentRecord.id, paymentRecord);

    return {
      status: 200,
      data: {
        success: true,
        payment: paymentRecord,
        redirectGatewayUrl: `https://sandbox.sslcommerz.com/gwprocess/v4/simulator.php?txn=${paymentRecord.providerReference}`,
      },
    };
  }

  // POST /payments/verify
  if (path === '/payments/verify' && method === 'POST') {
    const { paymentId, providerReference } = body || {};
    let payment: PaymentRecord | undefined;

    if (paymentId) payment = dbStore.payments.get(paymentId);
    else if (providerReference) {
      payment = Array.from(dbStore.payments.values()).find(
        (p) => p.providerReference === providerReference
      );
    }

    if (!payment) return { status: 404, data: { success: false, error: 'Payment record not found' } };

    const order = dbStore.orders.get(payment.orderId);
    if (!order) return { status: 500, data: { success: false, error: 'Linked order not found' } };

    // Fulfill payment & grant access
    payment.status = 'SUCCESS';
    payment.paidAt = new Date();

    order.status = 'PAID';
    order.paidAt = new Date();

    // Create or renew QuizAccess
    const accessKey = `${order.userId}_${order.quizId}`;
    const access: QuizAccessRecord = {
      id: `acc_${Date.now()}`,
      userId: order.userId,
      quizId: order.quizId,
      orderId: order.id,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000 * 365), // 1 year access
    };
    dbStore.quizAccess.set(accessKey, access);

    return {
      status: 200,
      data: {
        success: true,
        message: 'Payment verified and QuizAccess granted',
        order,
        payment,
        access,
      },
    };
  }

  // GET /quiz-access/check
  if (path === '/quiz-access/check' && method === 'GET') {
    const quizId = query.get('quizId');
    if (!quizId) return { status: 400, data: { success: false, error: 'quizId parameter is required' } };

    const access = dbStore.quizAccess.get(`${currentUserId}_${quizId}`);
    const hasActiveAccess = Boolean(access && (!access.expiresAt || access.expiresAt > new Date()));

    return {
      status: 200,
      data: {
        success: true,
        quizId,
        hasAccess: hasActiveAccess,
        expiresAt: access?.expiresAt || null,
      },
    };
  }

  return null;
}
