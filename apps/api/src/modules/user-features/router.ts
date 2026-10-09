/**
 * User Features, Gamification & Offline Sync Module
 * Models: Bookmark, SavedQuiz, LeaderboardEntry, Badge, UserBadge, OfflineSync
 */

import {
  dbStore,
  BookmarkRecord,
  SavedQuizRecord,
  OfflineSyncRecord,
  QuizAttemptRecord,
} from '../../services/store.js';

export function handleUserFeaturesRoutes(path: string, method: string, body: any, query: URLSearchParams, headers: Headers) {
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

  // POST /bookmarks
  if (path === '/bookmarks' && method === 'POST') {
    const { questionId } = body || {};
    if (!questionId) return { status: 400, data: { success: false, error: 'questionId is required' } };

    const key = `${currentUserId}_${questionId}`;
    if (dbStore.bookmarks.has(key)) {
      dbStore.bookmarks.delete(key);
      return { status: 200, data: { success: true, bookmarked: false, message: 'Bookmark removed' } };
    } else {
      const bm: BookmarkRecord = { userId: currentUserId, questionId, createdAt: new Date() };
      dbStore.bookmarks.set(key, bm);
      return { status: 200, data: { success: true, bookmarked: true, message: 'Question bookmarked' } };
    }
  }

  // GET /bookmarks
  if (path === '/bookmarks' && method === 'GET') {
    const userBookmarks = Array.from(dbStore.bookmarks.values())
      .filter((b) => b.userId === currentUserId)
      .map((b) => dbStore.questions.get(b.questionId))
      .filter(Boolean);

    return { status: 200, data: { success: true, count: userBookmarks.length, data: userBookmarks } };
  }

  // POST /saved-quizzes
  if (path === '/saved-quizzes' && method === 'POST') {
    const { quizId } = body || {};
    if (!quizId) return { status: 400, data: { success: false, error: 'quizId is required' } };

    const key = `${currentUserId}_${quizId}`;
    if (dbStore.savedQuizzes.has(key)) {
      dbStore.savedQuizzes.delete(key);
      return { status: 200, data: { success: true, saved: false, message: 'Quiz removed from saved' } };
    } else {
      const sq: SavedQuizRecord = { userId: currentUserId, quizId, createdAt: new Date() };
      dbStore.savedQuizzes.set(key, sq);
      return { status: 200, data: { success: true, saved: true, message: 'Quiz saved for later' } };
    }
  }

  // GET /saved-quizzes
  if (path === '/saved-quizzes' && method === 'GET') {
    const userSaved = Array.from(dbStore.savedQuizzes.values())
      .filter((sq) => sq.userId === currentUserId)
      .map((sq) => dbStore.quizzes.get(sq.quizId))
      .filter(Boolean);

    return { status: 200, data: { success: true, count: userSaved.length, data: userSaved } };
  }

  // GET /quizzes/:id/leaderboard
  const matchLeaderboard = path.match(/^\/quizzes\/([^/]+)\/leaderboard$/);
  if (matchLeaderboard && method === 'GET') {
    const quizId = matchLeaderboard[1];
    const entries = Array.from(dbStore.leaderboards.values())
      .filter((lb) => lb.quizId === quizId)
      .sort((a, b) => b.bestScore - a.bestScore)
      .map((lb, index) => {
        const u = dbStore.users.get(lb.userId);
        return {
          rank: index + 1,
          candidateName: u?.name || 'Anonymous Student',
          candidateEmail: u?.email || 'student@example.com',
          bestScore: lb.bestScore,
          bestPercentage: lb.bestPercentage,
          completedAt: lb.completedAt,
        };
      });

    return { status: 200, data: { success: true, quizId, totalRanked: entries.length, leaderboard: entries } };
  }

  // GET /badges
  if (path === '/badges' && method === 'GET') {
    const list = Array.from(dbStore.badges.values());
    return { status: 200, data: { success: true, count: list.length, data: list } };
  }

  // POST /sync/attempts (Offline Sync Engine for Expo SQLite client)
  if (path === '/sync/attempts' && method === 'POST') {
    const { syncKey, quizId, answers = [], timeTakenSeconds = 0 } = body || {};
    if (!syncKey || !quizId) {
      return { status: 400, data: { success: false, error: 'syncKey and quizId are required' } };
    }

    const syncRecordId = `${currentUserId}_${syncKey}`;
    const existing = dbStore.offlineSyncs.get(syncRecordId);
    if (existing && existing.status === 'PROCESSED') {
      return {
        status: 200,
        data: { success: true, message: 'Offline sync already processed (idempotent)', syncKey },
      };
    }

    // Register sync record
    const syncRecord: OfflineSyncRecord = {
      id: `sync_${Date.now()}`,
      userId: currentUserId,
      syncKey,
      status: 'PROCESSING',
      createdAt: new Date(),
      processedAt: null,
    };
    dbStore.offlineSyncs.set(syncRecordId, syncRecord);

    // Evaluate offline answers
    const quiz = dbStore.quizzes.get(quizId);
    if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found' } };

    const assignedQuestions = Array.from(dbStore.quizQuestions.values()).filter(
      (qq) => qq.quizId === quiz.id
    );

    let correctCount = 0;
    let wrongCount = 0;
    let totalScore = 0;
    const maxScore = assignedQuestions.length * 1.0;

    for (const qq of assignedQuestions) {
      const q = dbStore.questions.get(qq.questionId);
      if (!q) continue;

      const userAns = answers.find((a: any) => a.questionId === q.id);
      if (userAns && userAns.selectedOptionId) {
        const opt = dbStore.options.get(userAns.selectedOptionId);
        if (opt && opt.isCorrect) {
          correctCount++;
          totalScore += 1.0;
        } else {
          wrongCount++;
          totalScore -= quiz.negativeMark || 0;
        }
      }
    }

    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;

    // Create synchronized QuizAttempt record
    const attempt: QuizAttemptRecord = {
      id: `att_offline_${syncKey}`,
      userId: currentUserId,
      quizId: quiz.id,
      status: 'SUBMITTED',
      requestId: syncKey,
      startedAt: new Date(Date.now() - timeTakenSeconds * 1000),
      submittedAt: new Date(),
      expiresAt: null,
      totalQuestions: assignedQuestions.length,
      correctCount,
      wrongCount,
      unansweredCount: assignedQuestions.length - (correctCount + wrongCount),
      score: finalScore,
      maxScore,
      percentage,
      timeTakenSeconds,
    };
    dbStore.quizAttempts.set(attempt.id, attempt);

    // Mark sync record processed
    syncRecord.status = 'PROCESSED';
    syncRecord.processedAt = new Date();

    return {
      status: 200,
      data: {
        success: true,
        message: 'Offline synchronized attempt successfully recorded and scored',
        syncKey,
        attemptId: attempt.id,
        score: finalScore,
        percentage,
      },
    };
  }

  // GET /sync/status/:syncKey
  const matchSyncStatus = path.match(/^\/sync\/status\/([^/]+)$/);
  if (matchSyncStatus && method === 'GET') {
    const syncKey = matchSyncStatus[1];
    const record = dbStore.offlineSyncs.get(`${currentUserId}_${syncKey}`);
    if (!record) return { status: 404, data: { success: false, error: 'Sync key not found' } };
    return { status: 200, data: { success: true, syncRecord: record } };
  }

  return null;
}
