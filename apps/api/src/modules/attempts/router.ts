/**
 * Quiz Attempts & Authoritative Scoring Engine Module
 * Models: QuizAttempt, AttemptAnswer, LeaderboardEntry, UserBadge
 */

import {
  dbStore,
  QuizAttemptRecord,
  AttemptAnswerRecord,
  LeaderboardEntryRecord,
  UserBadgeRecord,
} from '../../services/store.js';

export function handleAttemptRoutes(path: string, method: string, body: any, headers: Headers) {
  // Resolve user from authorization header or fallback to test student
  const authHeader = headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let currentUserId = 'usr_student1'; // default test student
  if (token) {
    for (const sess of dbStore.sessions.values()) {
      if (sess.tokenHash === token) {
        currentUserId = sess.userId;
        break;
      }
    }
  }

  // POST /quizzes/:id/start
  const matchStart = path.match(/^\/quizzes\/([^/]+)\/start$/);
  if (matchStart && method === 'POST') {
    const quizId = matchStart[1];
    const quiz = dbStore.quizzes.get(quizId);
    if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found' } };

    if (quiz.status !== 'PUBLISHED') {
      return { status: 400, data: { success: false, error: 'Quiz is not published yet' } };
    }

    // Check paid access if quiz.price > 0
    if (quiz.price > 0) {
      const access = dbStore.quizAccess.get(`${currentUserId}_${quiz.id}`);
      const hasActiveAccess = access && (!access.expiresAt || access.expiresAt > new Date());
      if (!hasActiveAccess) {
        return {
          status: 403,
          data: {
            success: false,
            error: 'Paid examination requires active QuizAccess. Please complete checkout order first.',
            price: quiz.price,
            currency: quiz.currency,
          },
        };
      }
    }

    // Count questions
    const assignedQuestions = Array.from(dbStore.quizQuestions.values())
      .filter((qq) => qq.quizId === quiz.id)
      .sort((a, b) => a.position - b.position);

    const expiresAt = quiz.durationSeconds
      ? new Date(Date.now() + quiz.durationSeconds * 1000)
      : null;

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const attempt: QuizAttemptRecord = {
      id: attemptId,
      userId: currentUserId,
      quizId: quiz.id,
      status: 'IN_PROGRESS',
      requestId: body?.requestId || null,
      startedAt: new Date(),
      submittedAt: null,
      expiresAt,
      totalQuestions: assignedQuestions.length,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: assignedQuestions.length,
      score: 0,
      maxScore: assignedQuestions.length * 1.0,
      percentage: 0,
      timeTakenSeconds: null,
    };
    dbStore.quizAttempts.set(attempt.id, attempt);

    // Return attempt with clean questions list (answers hidden)
    const questionsForAttempt = assignedQuestions
      .map((qq) => {
        const q = dbStore.questions.get(qq.questionId);
        if (!q) return null;
        const opts = Array.from(dbStore.options.values())
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.position - b.position)
          .map((o) => ({ id: o.id, text: o.text, position: o.position }));
        return {
          id: q.id,
          position: qq.position,
          body: q.body,
          marks: qq.marks || q.marks,
          options: opts,
        };
      })
      .filter(Boolean);

    return {
      status: 201,
      data: {
        success: true,
        attemptId: attempt.id,
        quizTitle: quiz.title,
        durationSeconds: quiz.durationSeconds,
        negativeMark: quiz.negativeMark,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        totalQuestions: attempt.totalQuestions,
        questions: questionsForAttempt,
      },
    };
  }

  // Save single answer: POST /attempts/:id/answers
  const matchAnswer = path.match(/^\/attempts\/([^/]+)\/answers$/);
  if (matchAnswer && method === 'POST') {
    const attemptId = matchAnswer[1];
    const attempt = dbStore.quizAttempts.get(attemptId);
    if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found' } };

    if (attempt.status !== 'IN_PROGRESS') {
      return { status: 400, data: { success: false, error: `Attempt is already ${attempt.status}` } };
    }

    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      attempt.status = 'EXPIRED';
      return { status: 400, data: { success: false, error: 'Time expired for this quiz attempt' } };
    }

    const { questionId, selectedOptionId, timeTakenSeconds } = body || {};
    if (!questionId) return { status: 400, data: { success: false, error: 'questionId is required' } };

    const answerKey = `${attemptId}_${questionId}`;
    const answerRecord: AttemptAnswerRecord = {
      id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attemptId,
      questionId,
      selectedOptionId: selectedOptionId || null,
      isCorrect: null, // calculated upon submission
      marksAwarded: 0,
      timeTakenSeconds: timeTakenSeconds ? Number(timeTakenSeconds) : null,
      answeredAt: new Date(),
    };
    dbStore.attemptAnswers.set(answerKey, answerRecord);

    return {
      status: 200,
      data: {
        success: true,
        saved: { questionId, selectedOptionId, answeredAt: answerRecord.answeredAt },
      },
    };
  }

  // Submit attempt: POST /attempts/:id/submit
  const matchSubmit = path.match(/^\/attempts\/([^/]+)\/submit$/);
  if (matchSubmit && method === 'POST') {
    const attemptId = matchSubmit[1];
    const attempt = dbStore.quizAttempts.get(attemptId);
    if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found' } };

    if (attempt.status !== 'IN_PROGRESS') {
      return { status: 400, data: { success: false, error: `Attempt is already ${attempt.status}` } };
    }

    const quiz = dbStore.quizzes.get(attempt.quizId);
    if (!quiz) return { status: 500, data: { success: false, error: 'Quiz record missing' } };

    const assignedQuestions = Array.from(dbStore.quizQuestions.values()).filter(
      (qq) => qq.quizId === quiz.id
    );

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let totalScore = 0;
    let maxScore = 0;

    // Server-Authoritative Scoring Engine
    for (const qq of assignedQuestions) {
      const q = dbStore.questions.get(qq.questionId);
      if (!q) continue;

      const qMarks = qq.marks || q.marks || 1.0;
      maxScore += qMarks;

      const answer = dbStore.attemptAnswers.get(`${attemptId}_${q.id}`);

      if (!answer || !answer.selectedOptionId) {
        unansweredCount++;
        if (answer) {
          answer.isCorrect = false;
          answer.marksAwarded = 0;
        }
      } else {
        const selectedOpt = dbStore.options.get(answer.selectedOptionId);
        if (selectedOpt && selectedOpt.isCorrect) {
          correctCount++;
          answer.isCorrect = true;
          answer.marksAwarded = qMarks;
          totalScore += qMarks;
        } else {
          wrongCount++;
          answer.isCorrect = false;
          const penalty = quiz.negativeMark || 0;
          answer.marksAwarded = -penalty;
          totalScore -= penalty;
        }
      }
    }

    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;
    const timeTakenSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Update attempt record
    attempt.status = 'SUBMITTED';
    attempt.submittedAt = new Date();
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.unansweredCount = unansweredCount;
    attempt.score = finalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.timeTakenSeconds = timeTakenSeconds;

    // Update LeaderboardEntry
    const lbKey = `${attempt.userId}_${quiz.id}`;
    const existingLb = dbStore.leaderboards.get(lbKey);
    if (!existingLb || finalScore > existingLb.bestScore) {
      dbStore.leaderboards.set(lbKey, {
        id: `lb_${Date.now()}`,
        userId: attempt.userId,
        quizId: quiz.id,
        bestScore: finalScore,
        bestPercentage: percentage,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Award badge if score >= 80%
    if (percentage >= 80) {
      const pioneerBadge = dbStore.badges.get('bdg_pioneer');
      if (pioneerBadge) {
        const ubKey = `${attempt.userId}_${pioneerBadge.id}`;
        if (!dbStore.userBadges.has(ubKey)) {
          dbStore.userBadges.set(ubKey, {
            userId: attempt.userId,
            badgeId: pioneerBadge.id,
            earnedAt: new Date(),
          });
        }
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        attemptId: attempt.id,
        status: attempt.status,
        score: finalScore,
        maxScore,
        percentage,
        isPassed: quiz.passPercentage ? percentage >= quiz.passPercentage : true,
        correctCount,
        wrongCount,
        unansweredCount,
        timeTakenSeconds,
        submittedAt: attempt.submittedAt,
      },
    };
  }

  // Review Attempt: GET /attempts/:id
  const matchGetAttempt = path.match(/^\/attempts\/([^/]+)$/);
  if (matchGetAttempt && method === 'GET') {
    const attemptId = matchGetAttempt[1];
    const attempt = dbStore.quizAttempts.get(attemptId);
    if (!attempt) return { status: 404, data: { success: false, error: 'Attempt not found' } };

    const quiz = dbStore.quizzes.get(attempt.quizId);

    // Detailed question review with answers
    const answersBreakdown = Array.from(dbStore.quizQuestions.values())
      .filter((qq) => qq.quizId === attempt.quizId)
      .map((qq) => {
        const q = dbStore.questions.get(qq.questionId);
        if (!q) return null;
        const answer = dbStore.attemptAnswers.get(`${attemptId}_${q.id}`);
        const opts = Array.from(dbStore.options.values())
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.position - b.position);

        return {
          questionId: q.id,
          body: q.body,
          explanation: attempt.status === 'SUBMITTED' ? q.explanation : null,
          options: opts.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: attempt.status === 'SUBMITTED' ? o.isCorrect : undefined,
          })),
          selectedOptionId: answer?.selectedOptionId || null,
          isCorrect: answer?.isCorrect ?? null,
          marksAwarded: answer?.marksAwarded ?? 0,
        };
      })
      .filter(Boolean);

    return {
      status: 200,
      data: {
        success: true,
        attempt,
        quiz: quiz ? { id: quiz.id, title: quiz.title, negativeMark: quiz.negativeMark } : null,
        answers: answersBreakdown,
      },
    };
  }

  return null;
}
