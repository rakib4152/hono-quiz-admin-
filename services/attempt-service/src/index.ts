/**
 * Microservice: Quiz Attempt Service
 * Database: Hostinger MySQL (attempts, attempt_answers, bookmarks via Drizzle ORM) + memory store
 * Responsibilities: Timed attempts, server-authoritative scoring, negative marking,
 *                   offline batch sync, bookmarks, and saved quizzes.
 */

import { AttemptStatus } from '@shared-types';
import { quizService } from '@quiz-service';
import { paymentService } from '@payment-service';
import { analyticsService } from '@analytics-service';
import {
  attempts as attemptsTable,
  attemptAnswers as attemptAnswersTable,
  bookmarks as bookmarksTable,
  questions as questionsTable,
  quizzes as quizzesTable,
  createDrizzleClient,
  endDrizzleConnection,
  type DrizzleDB,
} from '../../../packages/database/src/index.js';
import { and, desc, eq, inArray } from 'drizzle-orm';

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

interface BookmarkEntity {
  userId: string;
  questionId: string;
  note?: string | null;
  createdAt: Date;
}

interface SavedQuizEntity {
  userId: string;
  quizId: string;
  createdAt: Date;
}

export const attemptDb = {
  attempts: new Map<string, QuizAttemptEntity>(),
  answers: new Map<string, AttemptAnswerEntity>(),
  bookmarks: new Map<string, BookmarkEntity>(),
  savedQuizzes: new Map<string, SavedQuizEntity>(),
  offlineSyncs: new Map<
    string,
    { id: string; userId: string; syncKey: string; status: string; createdAt: Date; processedAt: Date | null; result?: any }
  >(),
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
    console.warn('[attempt-service] DB operation fell back to memory store:', (err as any)?.message || err);
    return null;
  } finally {
    if (db) {
      await endDrizzleConnection(db).catch(() => {});
    }
  }
}

async function loadAttemptById(attemptId: string, env?: any): Promise<QuizAttemptEntity | null> {
  const fromDb = await withOptionalDb(env, async (db) => {
    const [row] = await db
      .select()
      .from(attemptsTable)
      .where(eq(attemptsTable.id, attemptId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      quizId: row.quizId,
      status: row.status as AttemptStatus,
      requestId: row.requestId,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      expiresAt: row.expiresAt,
      totalQuestions: row.totalQuestions,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      unansweredCount: row.unansweredCount,
      score: row.score,
      maxScore: row.maxScore,
      percentage: row.percentage,
      timeTakenSeconds: row.timeTakenSeconds,
    } as QuizAttemptEntity;
  });

  if (fromDb) {
    attemptDb.attempts.set(fromDb.id, fromDb);
    return fromDb;
  }
  return attemptDb.attempts.get(attemptId) || null;
}

async function loadAttemptAnswers(attemptId: string, env?: any): Promise<Map<string, AttemptAnswerEntity>> {
  const map = new Map<string, AttemptAnswerEntity>();

  for (const [k, ans] of attemptDb.answers.entries()) {
    if (k.startsWith(`${attemptId}_`) || ans.attemptId === attemptId) {
      map.set(ans.questionId, ans);
    }
  }

  const fromDb = await withOptionalDb(env, async (db) => {
    return db
      .select()
      .from(attemptAnswersTable)
      .where(eq(attemptAnswersTable.attemptId, attemptId));
  });

  if (fromDb) {
    for (const row of fromDb) {
      const entity: AttemptAnswerEntity = {
        id: row.id,
        attemptId: row.attemptId,
        questionId: row.questionId,
        selectedOptionId: row.selectedOptionId,
        isCorrect: row.isCorrect,
        marksAwarded: row.marksAwarded,
        timeTakenSeconds: row.timeTakenSeconds,
        answeredAt: row.answeredAt,
      };
      map.set(entity.questionId, entity);
      attemptDb.answers.set(`${attemptId}_${entity.questionId}`, entity);
    }
  }

  return map;
}

export const attemptService = {
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

    if (!userId) {
      return {
        status: 401,
        data: { success: false, error: 'Authentication required (Bearer token missing or invalid)', correlationId },
      };
    }

    // =========================================================================
    // 1. START QUIZ ATTEMPT
    //    Supports BOTH POST /quizzes/:quizId/start AND POST /quizzes/:quizId/attempts
    // =========================================================================
    const matchStart = path.match(/^\/quizzes\/([^/]+)\/(start|attempts)$/);
    if (matchStart && method === 'POST') {
      const quizId = matchStart[1];

      const quizKeyRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId },
        correlationId,
        env,
      });

      if (!quizKeyRes.data.success || !quizKeyRes.data.quiz || !quizKeyRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };
      }

      const quiz = quizKeyRes.data.quiz;
      const keys = quizKeyRes.data.keys;

      // Enforce paid access check if quiz.price > 0
      if (Number(quiz.price) > 0 && !isAdmin) {
        const accessCheck = await paymentService.handle({
          path: '/internal/check-access',
          method: 'POST',
          body: { userId, quizId },
          correlationId,
          userId,
          env,
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

      const attemptId = generateShortId('att');
      const durationSec = Number(quiz.durationSeconds) || 3600;
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + durationSec * 1000);
      const maxScore = keys.reduce((acc: number, k: any) => acc + (Number(k.marks) || 1.0), 0);

      const attempt: QuizAttemptEntity = {
        id: attemptId,
        userId,
        quizId,
        status: 'IN_PROGRESS',
        requestId: body?.requestId || null,
        startedAt,
        submittedAt: null,
        expiresAt,
        totalQuestions: keys.length,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: keys.length,
        score: 0,
        maxScore,
        percentage: 0,
        timeTakenSeconds: null,
      };
      attemptDb.attempts.set(attempt.id, attempt);

      await withOptionalDb(env, async (db) => {
        await db.insert(attemptsTable).values({
          id: attempt.id,
          userId: attempt.userId,
          quizId: attempt.quizId,
          status: attempt.status,
          requestId: attempt.requestId,
          startedAt: attempt.startedAt,
          submittedAt: null,
          expiresAt: attempt.expiresAt,
          totalQuestions: attempt.totalQuestions,
          correctCount: 0,
          wrongCount: 0,
          unansweredCount: attempt.unansweredCount,
          score: 0,
          maxScore: attempt.maxScore,
          percentage: 0,
          timeTakenSeconds: null,
        });
      });

      return {
        status: 201,
        data: {
          success: true,
          attemptId: attempt.id,
          quizId: attempt.quizId,
          userId: attempt.userId,
          deviceType: body?.deviceType || 'WEB',
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          durationSeconds: durationSec,
          totalQuestions: attempt.totalQuestions,
          maxScore: attempt.maxScore,
          correlationId,
        },
      };
    }

    // =========================================================================
    // 2. SAVE CANDIDATE ANSWER
    //    Supports BOTH POST /attempts/:attemptId/answers (questionId in body)
    //    AND PUT /attempts/:attemptId/answers/:questionId
    // =========================================================================
    const matchSaveAnswerPost = path.match(/^\/attempts\/([^/]+)\/answers$/);
    const matchSaveAnswerPut = path.match(/^\/attempts\/([^/]+)\/answers\/([^/]+)$/);
    if ((matchSaveAnswerPost && method === 'POST') || (matchSaveAnswerPut && method === 'PUT')) {
      const attemptId = (matchSaveAnswerPost || matchSaveAnswerPut)![1];
      const questionId = matchSaveAnswerPut ? matchSaveAnswerPut[2] : body?.questionId;

      if (!questionId || typeof questionId !== 'string') {
        return { status: 400, data: { success: false, error: 'questionId is required', correlationId } };
      }

      const attempt = await loadAttemptById(attemptId, env);
      if (!attempt) {
        return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };
      }
      if (attempt.userId !== userId && !isAdmin) {
        return { status: 403, data: { success: false, error: 'Forbidden: Attempt belongs to another user', correlationId } };
      }
      if (attempt.status !== 'IN_PROGRESS') {
        return { status: 400, data: { success: false, error: 'Attempt is already submitted or expired', correlationId } };
      }
      if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
        attempt.status = 'EXPIRED';
        return { status: 400, data: { success: false, error: 'Timer expired', correlationId } };
      }

      const selectedOptionId = body?.selectedOptionId || null;
      const rawTime = body?.timeSpentSeconds ?? body?.timeTakenSeconds ?? null;
      const timeTakenSeconds = rawTime !== null && rawTime !== undefined ? Number(rawTime) : null;

      const answerKey = `${attemptId}_${questionId}`;
      const existingAnswer = attemptDb.answers.get(answerKey);
      const answer: AttemptAnswerEntity = {
        id: existingAnswer?.id || generateShortId('ans'),
        attemptId,
        questionId,
        selectedOptionId,
        isCorrect: null,
        marksAwarded: 0,
        timeTakenSeconds,
        answeredAt: new Date(),
      };
      attemptDb.answers.set(answerKey, answer);

      await withOptionalDb(env, async (db) => {
        const [existingRow] = await db
          .select()
          .from(attemptAnswersTable)
          .where(
            and(
              eq(attemptAnswersTable.attemptId, attemptId),
              eq(attemptAnswersTable.questionId, questionId)
            )
          )
          .limit(1);

        if (existingRow) {
          await db
            .update(attemptAnswersTable)
            .set({
              selectedOptionId: answer.selectedOptionId,
              timeTakenSeconds: answer.timeTakenSeconds,
              answeredAt: answer.answeredAt,
            })
            .where(eq(attemptAnswersTable.id, existingRow.id));
        } else {
          await db.insert(attemptAnswersTable).values({
            id: answer.id,
            attemptId: answer.attemptId,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            isCorrect: null,
            marksAwarded: 0,
            timeTakenSeconds: answer.timeTakenSeconds,
            answeredAt: answer.answeredAt,
          });
        }
      });

      return {
        status: 200,
        data: {
          success: true,
          saved: true,
          attemptId,
          questionId,
          selectedOptionId,
          timeSpentSeconds: timeTakenSeconds,
          answeredAt: answer.answeredAt,
          correlationId,
        },
      };
    }

    // =========================================================================
    // 3. SUBMIT ATTEMPT FOR SERVER-AUTHORITATIVE SCORING
    //    POST /attempts/:attemptId/submit
    // =========================================================================
    const matchSubmit = path.match(/^\/attempts\/([^/]+)\/submit$/);
    if (matchSubmit && method === 'POST') {
      const attemptId = matchSubmit[1];
      const attempt = await loadAttemptById(attemptId, env);
      if (!attempt) {
        return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };
      }
      if (attempt.userId !== userId && !isAdmin) {
        return { status: 403, data: { success: false, error: 'Forbidden: Attempt belongs to another user', correlationId } };
      }
      if (attempt.status === 'SUBMITTED') {
        return { status: 200, data: { success: true, alreadySubmitted: true, result: attempt, attempt, correlationId } };
      }

      const keysRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId: attempt.quizId },
        correlationId,
        env,
      });

      if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz keys not found', correlationId } };
      }

      const quiz = keysRes.data.quiz;
      const keys = keysRes.data.keys;
      const answersMap = await loadAttemptAnswers(attemptId, env);

      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      let totalScore = 0;
      let computedMaxScore = 0;

      for (const k of keys) {
        const answer = answersMap.get(k.questionId);
        const questionMarks = Number(k.marks) || 1.0;
        computedMaxScore += questionMarks;

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
          const penalty = Number(quiz.negativeMark) || 0;
          answer.marksAwarded = -penalty;
          totalScore -= penalty;
        }
      }

      const maxScore = attempt.maxScore > 0 ? attempt.maxScore : computedMaxScore;
      const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
      const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;
      const submittedAt = body?.completedAt ? new Date(body.completedAt) : new Date();
      const safeSubmittedAt = Number.isNaN(submittedAt.getTime()) ? new Date() : submittedAt;
      const duration = Math.max(
        0,
        Math.floor((safeSubmittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      );

      attempt.status = 'SUBMITTED';
      attempt.submittedAt = safeSubmittedAt;
      attempt.correctCount = correct;
      attempt.wrongCount = wrong;
      attempt.unansweredCount = unanswered;
      attempt.score = finalScore;
      attempt.maxScore = maxScore;
      attempt.percentage = percentage;
      attempt.timeTakenSeconds = duration;
      attemptDb.attempts.set(attempt.id, attempt);

      await withOptionalDb(env, async (db) => {
        await db
          .update(attemptsTable)
          .set({
            status: attempt.status,
            submittedAt: attempt.submittedAt,
            correctCount: attempt.correctCount,
            wrongCount: attempt.wrongCount,
            unansweredCount: attempt.unansweredCount,
            score: attempt.score,
            maxScore: attempt.maxScore,
            percentage: attempt.percentage,
            timeTakenSeconds: attempt.timeTakenSeconds,
          })
          .where(eq(attemptsTable.id, attempt.id));

        for (const ans of answersMap.values()) {
          await db
            .update(attemptAnswersTable)
            .set({
              isCorrect: ans.isCorrect,
              marksAwarded: ans.marksAwarded,
            })
            .where(
              and(
                eq(attemptAnswersTable.attemptId, attempt.id),
                eq(attemptAnswersTable.questionId, ans.questionId)
              )
            );
        }
      });

      await analyticsService.handle({
        path: '/internal/record-attempt-result',
        method: 'POST',
        body: { userId: attempt.userId, quizId: attempt.quizId, score: finalScore, percentage },
        correlationId,
        userId: attempt.userId,
        env,
      });

      return {
        status: 200,
        data: {
          success: true,
          result: {
            attemptId: attempt.id,
            quizId: attempt.quizId,
            status: attempt.status,
            score: finalScore,
            maxScore,
            percentage,
            passed: quiz.passPercentage ? percentage >= Number(quiz.passPercentage) : percentage >= 50,
            correctCount: correct,
            wrongCount: wrong,
            unansweredCount: unanswered,
            timeTakenSeconds: duration,
            submittedAt: attempt.submittedAt,
          },
          correlationId,
        },
      };
    }

    // =========================================================================
    // 4. GET ATTEMPT SUMMARY / RESULT
    //    Supports BOTH GET /attempts/:attemptId AND GET /attempts/:attemptId/result
    // =========================================================================
    const matchGetAttempt = path.match(/^\/attempts\/([^/]+)(\/result)?$/);
    if (matchGetAttempt && method === 'GET') {
      const attemptId = matchGetAttempt[1];
      const attempt = await loadAttemptById(attemptId, env);
      if (!attempt) {
        return { status: 404, data: { success: false, error: 'Attempt not found', correlationId } };
      }
      if (attempt.userId !== userId && !isAdmin) {
        return { status: 403, data: { success: false, error: 'Forbidden: Attempt belongs to another user', correlationId } };
      }

      const answersMap = await loadAttemptAnswers(attemptId, env);
      const answers = Array.from(answersMap.values());

      return {
        status: 200,
        data: {
          success: true,
          attempt: { ...attempt, answers },
          result: { ...attempt, answers },
          correlationId,
        },
      };
    }

    // =========================================================================
    // 5. OFFLINE ATTEMPT SYNCHRONIZATION
    //    Supports BOTH POST /sync/attempts (batch) AND POST /sync/push (single)
    // =========================================================================
    if (path === '/sync/attempts' && method === 'POST') {
      const batchId = body?.batchId || `batch_${Date.now()}`;
      const rawAttempts = Array.isArray(body?.attempts) ? body.attempts : [];

      if (rawAttempts.length === 0) {
        return {
          status: 400,
          data: { success: false, error: 'attempts array is required and must not be empty', correlationId },
        };
      }

      const syncedResults: any[] = [];
      const errors: any[] = [];

      for (const item of rawAttempts) {
        const clientAttemptId = item?.clientAttemptId || `offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const quizId = item?.quizId;
        const answers = Array.isArray(item?.answers) ? item.answers : [];

        if (!quizId) {
          errors.push({ clientAttemptId, error: 'quizId is required' });
          continue;
        }

        const syncKeyFull = `${userId}_${batchId}_${clientAttemptId}`;
        const existingSync = attemptDb.offlineSyncs.get(syncKeyFull);
        if (existingSync && existingSync.status === 'PROCESSED') {
          syncedResults.push({
            clientAttemptId,
            idempotent: true,
            ...(existingSync.result || {}),
          });
          continue;
        }

        const keysRes = await quizService.handle({
          path: '/internal/quiz-scoring-keys',
          method: 'POST',
          body: { quizId },
          correlationId,
          env,
        });

        if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
          errors.push({ clientAttemptId, quizId, error: 'Quiz not found' });
          continue;
        }

        const quiz = keysRes.data.quiz;
        const keys = keysRes.data.keys;
        let correct = 0;
        let wrong = 0;
        let score = 0;
        let maxScore = 0;

        for (const k of keys) {
          const qMarks = Number(k.marks) || 1.0;
          maxScore += qMarks;
          const userAns = answers.find((a: any) => a.questionId === k.questionId);
          if (userAns?.selectedOptionId === k.correctOptionId) {
            correct++;
            score += qMarks;
          } else if (userAns?.selectedOptionId) {
            wrong++;
            score -= Number(quiz.negativeMark) || 0;
          }
        }

        const finalScore = Math.max(0, Math.round(score * 100) / 100);
        const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;
        const startedAt = item.startedAt ? new Date(item.startedAt) : new Date();
        const completedAt = item.completedAt ? new Date(item.completedAt) : new Date();
        const timeTakenSeconds = Math.max(
          0,
          Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
        );
        const attemptId = generateShortId('att');

        const attemptEntity: QuizAttemptEntity = {
          id: attemptId,
          userId,
          quizId,
          status: 'SUBMITTED',
          requestId: `${batchId}:${clientAttemptId}`.slice(0, 191),
          startedAt,
          submittedAt: completedAt,
          expiresAt: null,
          totalQuestions: keys.length,
          correctCount: correct,
          wrongCount: wrong,
          unansweredCount: Math.max(0, keys.length - (correct + wrong)),
          score: finalScore,
          maxScore,
          percentage,
          timeTakenSeconds,
        };
        attemptDb.attempts.set(attemptId, attemptEntity);

        await withOptionalDb(env, async (db) => {
          await db.insert(attemptsTable).values({
            id: attemptEntity.id,
            userId: attemptEntity.userId,
            quizId: attemptEntity.quizId,
            status: attemptEntity.status,
            requestId: attemptEntity.requestId,
            startedAt: attemptEntity.startedAt,
            submittedAt: attemptEntity.submittedAt,
            expiresAt: null,
            totalQuestions: attemptEntity.totalQuestions,
            correctCount: attemptEntity.correctCount,
            wrongCount: attemptEntity.wrongCount,
            unansweredCount: attemptEntity.unansweredCount,
            score: attemptEntity.score,
            maxScore: attemptEntity.maxScore,
            percentage: attemptEntity.percentage,
            timeTakenSeconds: attemptEntity.timeTakenSeconds,
          });
        });

        await analyticsService.handle({
          path: '/internal/record-attempt-result',
          method: 'POST',
          body: { userId, quizId, score: finalScore, percentage },
          correlationId,
          userId,
          env,
        });

        const itemSummary = {
          clientAttemptId,
          attemptId,
          quizId,
          score: finalScore,
          maxScore,
          percentage,
          correctCount: correct,
          wrongCount: wrong,
          status: 'SYNCED',
        };

        attemptDb.offlineSyncs.set(syncKeyFull, {
          id: `sync_${Date.now()}`,
          userId,
          syncKey: syncKeyFull,
          status: 'PROCESSED',
          createdAt: new Date(),
          processedAt: new Date(),
          result: itemSummary,
        });

        syncedResults.push(itemSummary);
      }

      return {
        status: 200,
        data: {
          success: true,
          batchId,
          syncedCount: syncedResults.length,
          failedCount: errors.length,
          results: syncedResults,
          errors,
          correlationId,
        },
      };
    }

    // Legacy single offline sync endpoint: POST /sync/push
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

      const keysRes = await quizService.handle({
        path: '/internal/quiz-scoring-keys',
        method: 'POST',
        body: { quizId },
        correlationId,
        env,
      });

      if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
        return { status: 404, data: { success: false, error: 'Quiz keys not found', correlationId } };
      }

      const quiz = keysRes.data.quiz;
      const keys = keysRes.data.keys;
      let correct = 0;
      let wrong = 0;
      let score = 0;
      let maxScore = 0;

      for (const k of keys) {
        const qMarks = Number(k.marks) || 1.0;
        maxScore += qMarks;
        const userAns = answers.find((a: any) => a.questionId === k.questionId);
        if (userAns?.selectedOptionId === k.correctOptionId) {
          correct++;
          score += qMarks;
        } else if (userAns?.selectedOptionId) {
          wrong++;
          score -= Number(quiz.negativeMark) || 0;
        }
      }

      const finalScore = Math.max(0, Math.round(score * 100) / 100);
      const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;
      const attemptId = generateShortId('att');

      attemptDb.attempts.set(attemptId, {
        id: attemptId,
        userId,
        quizId,
        status: 'SUBMITTED',
        requestId: syncKey,
        startedAt: new Date(Date.now() - Number(timeTakenSeconds) * 1000),
        submittedAt: new Date(),
        expiresAt: null,
        totalQuestions: keys.length,
        correctCount: correct,
        wrongCount: wrong,
        unansweredCount: Math.max(0, keys.length - (correct + wrong)),
        score: finalScore,
        maxScore,
        percentage,
        timeTakenSeconds: Number(timeTakenSeconds),
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
          percentage,
          message: 'Offline attempt successfully ingested and scored',
          correlationId,
        },
      };
    }

    // =========================================================================
    // 6. BOOKMARKS (GET /bookmarks, POST /bookmarks/toggle)
    // =========================================================================
    if (path === '/bookmarks' && method === 'GET') {
      const dbBookmarks = await withOptionalDb(env, async (db) => {
        const rows = await db
          .select()
          .from(bookmarksTable)
          .where(eq(bookmarksTable.userId, userId))
          .orderBy(desc(bookmarksTable.createdAt));

        const qIds = rows.map((r) => r.questionId);
        const qRows =
          qIds.length > 0
            ? await db.select().from(questionsTable).where(inArray(questionsTable.id, qIds))
            : [];
        const qMap = new Map(qRows.map((q) => [q.id, q]));

        return rows.map((r) => {
          const mem = attemptDb.bookmarks.get(`${userId}_${r.questionId}`);
          const question = qMap.get(r.questionId);
          return {
            userId: r.userId,
            questionId: r.questionId,
            note: mem?.note ?? null,
            createdAt: r.createdAt,
            question: question
              ? { id: question.id, body: question.body, marks: question.marks, difficulty: question.difficulty }
              : null,
          };
        });
      });

      const list =
        dbBookmarks ??
        Array.from(attemptDb.bookmarks.values())
          .filter((b) => b.userId === userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        status: 200,
        data: {
          success: true,
          count: list.length,
          bookmarks: list,
          data: list,
          correlationId,
        },
      };
    }

    if (path === '/bookmarks/toggle' && method === 'POST') {
      const { questionId, note } = body || {};
      if (!questionId || typeof questionId !== 'string') {
        return { status: 400, data: { success: false, error: 'questionId is required', correlationId } };
      }

      const key = `${userId}_${questionId}`;
      const dbResult = await withOptionalDb(env, async (db) => {
        const [existing] = await db
          .select()
          .from(bookmarksTable)
          .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.questionId, questionId)))
          .limit(1);

        if (existing) {
          await db
            .delete(bookmarksTable)
            .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.questionId, questionId)));
          attemptDb.bookmarks.delete(key);
          return { bookmarked: false };
        } else {
          await db.insert(bookmarksTable).values({
            userId,
            questionId,
          });
          const entity: BookmarkEntity = {
            userId,
            questionId,
            note: typeof note === 'string' ? note : null,
            createdAt: new Date(),
          };
          attemptDb.bookmarks.set(key, entity);
          return { bookmarked: true, bookmark: entity };
        }
      });

      if (dbResult) {
        return {
          status: 200,
          data: {
            success: true,
            questionId,
            bookmarked: dbResult.bookmarked,
            bookmark: dbResult.bookmark || null,
            correlationId,
          },
        };
      }

      if (attemptDb.bookmarks.has(key)) {
        attemptDb.bookmarks.delete(key);
        return { status: 200, data: { success: true, questionId, bookmarked: false, correlationId } };
      }

      const created: BookmarkEntity = {
        userId,
        questionId,
        note: typeof note === 'string' ? note : null,
        createdAt: new Date(),
      };
      attemptDb.bookmarks.set(key, created);
      return { status: 200, data: { success: true, questionId, bookmarked: true, bookmark: created, correlationId } };
    }

    // =========================================================================
    // 7. SAVED QUIZZES (GET /saved-quizzes, POST /saved-quizzes/toggle)
    // =========================================================================
    if (path === '/saved-quizzes' && method === 'GET') {
      const savedList = Array.from(attemptDb.savedQuizzes.values())
        .filter((s) => s.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const quizIds = savedList.map((s) => s.quizId);
      const quizMap = new Map<string, any>();
      if (quizIds.length > 0) {
        const dbQuizzes = await withOptionalDb(env, async (db) =>
          db.select().from(quizzesTable).where(inArray(quizzesTable.id, quizIds))
        );
        if (dbQuizzes) {
          for (const q of dbQuizzes) {
            quizMap.set(q.id, q);
          }
        }
      }

      const enriched = savedList.map((s) => ({
        ...s,
        quiz: quizMap.get(s.quizId) || null,
      }));

      return {
        status: 200,
        data: {
          success: true,
          count: enriched.length,
          savedQuizzes: enriched,
          data: enriched,
          correlationId,
        },
      };
    }

    if (path === '/saved-quizzes/toggle' && method === 'POST') {
      const { quizId } = body || {};
      if (!quizId || typeof quizId !== 'string') {
        return { status: 400, data: { success: false, error: 'quizId is required', correlationId } };
      }

      const key = `${userId}_${quizId}`;
      if (attemptDb.savedQuizzes.has(key)) {
        attemptDb.savedQuizzes.delete(key);
        return {
          status: 200,
          data: { success: true, quizId, saved: false, correlationId },
        };
      }

      const created: SavedQuizEntity = {
        userId,
        quizId,
        createdAt: new Date(),
      };
      attemptDb.savedQuizzes.set(key, created);
      return {
        status: 200,
        data: { success: true, quizId, saved: true, savedQuiz: created, correlationId },
      };
    }

    return { status: 404, data: { success: false, error: `Attempt route '${path}' not found`, correlationId } };
  },
};