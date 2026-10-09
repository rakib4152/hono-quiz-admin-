/**
 * Microservice: Quiz Attempt Service
 * Database: attempt_db (QuizAttempt, AttemptAnswer, Bookmark, SavedQuiz, OfflineSync)
 * Responsibilities: Timed attempts, server-authoritative scoring, negative marking, offline sync
 */

import { AttemptStatus } from '../../../packages/shared-types/src/index.js';
import { quizService } from '../../quiz-service/src/index.js';
import { paymentService } from '../../payment-service/src/index.js';
import { analyticsService } from '../../analytics-service/src/index.js';

interface QuizAttemptEntity {
  id: string;
  userId: string;
  quizId: string;
  status: AttemptStatus;
  requestId: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  maxScore: number;
  percentage: number;
  timeTakenSeconds: number | null;
}

interface AttemptAnswerEntity {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  timeTakenSeconds: number | null;
  answeredAt: Date;
}

export const attemptDb = {
  attempts: new Map<string, QuizAttemptEntity>(),
  answers: new Map<string, AttemptAnswerEntity>(),
  bookmarks: new Map<string, { userId: string; questionId: string; createdAt: Date }>(),
  savedQuizzes: new Map<string, { userId: string; quizId: string; createdAt: Date }>(),
  offlineSyncs: new Map<string, { id: string; userId: string; syncKey: string; status: string; createdAt: Date; processedAt: Date | null }>(),
};

export const attemptService = {
  async handle(req: { path: string; method: string; body?: any; correlationId: string; userId?: string }) {
    const { path, method, body, correlationId, userId = 'usr_student1' } = req;

    // POST /quizzes/:quizId/attempts (Start Quiz Attempt)
    const matchStart = path.match(/^\/quizzes\/([^/]+)\/attempts$/);
    if (matchStart && method === 'POST') {
      const quizId = matchStart[1];

      // 1. Inter-service call to quiz-service: fetch quiz metadata
      const quizKeyRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId },
        correlationId,
      });

      if (!quizKeyRes.data.success || !quizKeyRes.data.quiz || !quizKeyRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };
      }

      const quiz = quizKeyRes.data.quiz;
      const keys = quizKeyRes.data.keys;

      // 2. Inter-service call to payment-service: check paid access if quiz.price > 0
      if (quiz.price > 0) {
        const accessCheck = await paymentService.handle({
          path: '/internal/check-access',
          method: 'POST',
          body: { userId, quizId },
          correlationId,
        });

        if (!accessCheck.data.hasAccess) {
          return {
            status: 403,
            data: {
              success: false,
              error: 'Paid quiz requires active QuizAccess grant. Please complete checkout.',
              price: quiz.price,
              correlationId,
            },
          };
        }
      }

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const durationSec = 3600; // 60 mins default
      const expiresAt = new Date(Date.now() + durationSec * 1000);

      const attempt: QuizAttemptEntity = {
        id: attemptId,
        userId,
        quizId,
        status: 'IN_PROGRESS',
        requestId: body?.requestId || null,
        startedAt: new Date(),
        submittedAt: null,
        expiresAt,
        totalQuestions: keys.length,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: keys.length,
        score: 0,
        maxScore: keys.reduce((acc: number, k: any) => acc + (k.marks || 1.0), 0),
        percentage: 0,
        timeTakenSeconds: null,
      };
      attemptDb.attempts.set(attempt.id, attempt);

      return {
        status: 201,
        data: {
          success: true,
          attemptId: attempt.id,
          quizId: attempt.quizId,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          totalQuestions: attempt.totalQuestions,
          correlationId,
        },
      };
    }

    // PUT /attempts/:attemptId/answers/:questionId (Save Answer)
    const matchSaveAnswer = path.match(/^\/attempts\/([^/]+)\/answers\/([^/]+)$/);
    if (matchSaveAnswer && method === 'PUT') {
      const [, attemptId, questionId] = matchSaveAnswer;
      const attempt = attemptDb.attempts.get(attemptId);
      if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };

      if (attempt.status !== 'IN_PROGRESS') {
        return { status: 400, data: { success: false, error: 'Attempt is already submitted or expired', correlationId } };
      }

      if (attempt.expiresAt && new Date() > attempt.expiresAt) {
        attempt.status = 'EXPIRED';
        return { status: 400, data: { success: false, error: 'Timer expired', correlationId } };
      }

      const { selectedOptionId, timeTakenSeconds } = body || {};
      const answerKey = `${attemptId}_${questionId}`;
      const answer: AttemptAnswerEntity = {
        id: `ans_${Date.now()}`,
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId || null,
        isCorrect: null, // Scored authoritatively upon submit
        marksAwarded: 0,
        timeTakenSeconds: timeTakenSeconds || null,
        answeredAt: new Date(),
      };
      attemptDb.answers.set(answerKey, answer);

      return { status: 200, data: { success: true, saved: true, questionId, selectedOptionId, correlationId } };
    }

    // POST /attempts/:attemptId/submit (Server-Authoritative Scoring Engine)
    const matchSubmit = path.match(/^\/attempts\/([^/]+)\/submit$/);
    if (matchSubmit && method === 'POST') {
      const attemptId = matchSubmit[1];
      const attempt = attemptDb.attempts.get(attemptId);
      if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };

      if (attempt.status === 'SUBMITTED') {
        return { status: 200, data: { success: true, alreadySubmitted: true, attempt, correlationId } };
      }

      // Inter-service call to quiz-service: fetch answer keys
      const keysRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId: attempt.quizId },
        correlationId,
      });

      if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz keys not found', correlationId } };
      }

      const quiz = keysRes.data.quiz;
      const keys = keysRes.data.keys;
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      let totalScore = 0;

      for (const k of keys) {
        const answer = attemptDb.answers.get(`${attemptId}_${k.questionId}`);
        const questionMarks = k.marks || 1.0;

        if (!answer || !answer.selectedOptionId) {
          unanswered++;
          if (answer) {
            answer.isCorrect = false;
            answer.marksAwarded = 0;
          }
        } else if (answer.selectedOptionId === k.correctOptionId) {
          correct++;
          answer.isCorrect = true;
          answer.marksAwarded = questionMarks;
          totalScore += questionMarks;
        } else {
          wrong++;
          answer.isCorrect = false;
          const penalty = quiz.negativeMark || 0;
          answer.marksAwarded = -penalty;
          totalScore -= penalty;
        }
      }

      const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
      const percentage = attempt.maxScore > 0 ? Math.round((finalScore / attempt.maxScore) * 10000) / 100 : 0;
      const duration = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

      attempt.status = 'SUBMITTED';
      attempt.submittedAt = new Date();
      attempt.correctCount = correct;
      attempt.wrongCount = wrong;
      attempt.unansweredCount = unanswered;
      attempt.score = finalScore;
      attempt.percentage = percentage;
      attempt.timeTakenSeconds = duration;

      // Eventual consistency: Publish attempt result to analytics-service
      await analyticsService.handle({
        path: '/internal/record-attempt-result',
        method: 'POST',
        body: { userId: attempt.userId, quizId: attempt.quizId, score: finalScore, percentage },
        correlationId,
      });

      return {
        status: 200,
        data: {
          success: true,
          result: {
            attemptId: attempt.id,
            status: attempt.status,
            score: finalScore,
            maxScore: attempt.maxScore,
            percentage,
            correctCount: correct,
            wrongCount: wrong,
            unansweredCount: unanswered,
            timeTakenSeconds: duration,
          },
          correlationId,
        },
      };
    }

    // GET /attempts/:attemptId/result
    const matchResult = path.match(/^\/attempts\/([^/]+)\/result$/);
    if (matchResult && method === 'GET') {
      const attemptId = matchResult[1];
      const attempt = attemptDb.attempts.get(attemptId);
      if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };
      return { status: 200, data: { success: true, result: attempt, correlationId } };
    }

    // POST /sync/push (Expo React Native offline synchronization)
    if (path === '/sync/push' && method === 'POST') {
      const { syncKey, quizId, answers = [], timeTakenSeconds = 0 } = body || {};
      if (!syncKey || !quizId) {
        return { status: 400, data: { success: false, error: 'syncKey and quizId required', correlationId } };
      }

      const syncKeyFull = `${userId}_${syncKey}`;
      const existing = attemptDb.offlineSyncs.get(syncKeyFull);
      if (existing && existing.status === 'PROCESSED') {
        return { status: 200, data: { success: true, idempotent: true, correlationId } };
      }

      // Score offline answers authoritatively
      const keysRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId },
        correlationId,
      });

      if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz keys not found', correlationId } };
      }

      const quiz = keysRes.data.quiz;
      const keys = keysRes.data.keys;
      let correct = 0;
      let wrong = 0;
      let score = 0;

      for (const k of keys) {
        const userAns = answers.find((a: any) => a.questionId === k.questionId);
        if (userAns?.selectedOptionId === k.correctOptionId) {
          correct++;
          score += k.marks || 1.0;
        } else if (userAns?.selectedOptionId) {
          wrong++;
          score -= quiz.negativeMark || 0;
        }
      }

      const finalScore = Math.max(0, Math.round(score * 100) / 100);
      const attemptId = `att_offline_${syncKey}`;

      attemptDb.attempts.set(attemptId, {
        id: attemptId,
        userId,
        quizId,
        status: 'SUBMITTED',
        requestId: syncKey,
        startedAt: new Date(Date.now() - timeTakenSeconds * 1000),
        submittedAt: new Date(),
        expiresAt: null,
        totalQuestions: keys.length,
        correctCount: correct,
        wrongCount: wrong,
        unansweredCount: keys.length - (correct + wrong),
        score: finalScore,
        maxScore: keys.length * 1.0,
        percentage: Math.round((finalScore / (keys.length * 1.0)) * 100),
        timeTakenSeconds,
      });

      attemptDb.offlineSyncs.set(syncKeyFull, {
        id: `sync_${Date.now()}`,
        userId,
        syncKey,
        status: 'PROCESSED',
        createdAt: new Date(),
        processedAt: new Date(),
      });

      return {
        status: 200,
        data: {
          success: true,
          syncKey,
          attemptId,
          score: finalScore,
          message: 'Offline attempt successfully ingested and scored',
          correlationId,
        },
      };
    }

    return { status: 404, data: { success: false, error: 'Attempt route not found', correlationId } };
  },
};
