/**
 * Microservice: Analytics & Leaderboard Service
 * Database: Hostinger MySQL (attempts + users via Drizzle ORM) + badge catalog
 * Responsibilities: Quiz leaderboards with deterministic tie-breaking, earned badges
 */

import {
  attempts as attemptsTable,
  users as usersTable,
  createDrizzleClient,
  endDrizzleConnection,
  type DrizzleDB,
} from '../../../packages/database/src/index.js';
import { and, desc, eq } from 'drizzle-orm';

interface BadgeEntity {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface UserBadgeEntity {
  userId: string;
  badgeId: string;
  earnedAt: Date;
}

interface LeaderboardEntryEntity {
  id: string;
  userId: string;
  userName?: string | null;
  quizId: string;
  bestScore: number;
  bestPercentage: number;
  completedAt: Date | null;
  updatedAt: Date;
}

export const analyticsDb = {
  badges: new Map<string, BadgeEntity>(),
  userBadges: new Map<string, UserBadgeEntity>(),
  leaderboards: new Map<string, LeaderboardEntryEntity>(),
};

// Seed badge catalog
analyticsDb.badges.set('bdg_first_attempt', {
  id: 'bdg_first_attempt',
  name: 'First Exam Completed',
  description: 'Successfully submitted your first timed model test.',
  imageUrl: 'https://assets.jobexambd.com/badges/first-attempt.png',
});

analyticsDb.badges.set('bdg_gold', {
  id: 'bdg_gold',
  name: 'National Top 10% Ranker',
  description: 'Scored 90%+ in a national preliminary model examination.',
  imageUrl: 'https://assets.jobexambd.com/badges/gold.png',
});

analyticsDb.badges.set('bdg_streak', {
  id: 'bdg_streak',
  name: '7-Day Examination Streak',
  description: 'Completed at least one daily timed quiz for 7 consecutive days.',
  imageUrl: 'https://assets.jobexambd.com/badges/streak.png',
});

async function withOptionalDb<T>(
  env: any,
  fn: (db: DrizzleDB) => Promise<T>
): Promise<T | null> {
  let db: DrizzleDB | null = null;
  try {
    db = await createDrizzleClient(env);
    return await fn(db);
  } catch (err) {
    console.warn('[analytics-service] DB query fell back to memory store:', (err as any)?.message || err);
    return null;
  } finally {
    if (db) {
      await endDrizzleConnection(db).catch(() => {});
    }
  }
}

export const analyticsService = {
  async handle(req: {
    path: string;
    method: string;
    body?: any;
    correlationId: string;
    userId?: string;
    env?: any;
  }) {
    const { path, method, body, correlationId, userId, env } = req;

    // =========================================================================
    // 1. GET QUIZ LEADERBOARD
    //    Supports BOTH GET /leaderboards/:quizId AND GET /leaderboards/quizzes/:quizId
    // =========================================================================
    const matchQuizLb =
      path.match(/^\/leaderboards\/quizzes\/([^/]+)$/) ||
      path.match(/^\/leaderboards\/([^/]+)$/);

    if (matchQuizLb && method === 'GET') {
      const quizId = matchQuizLb[1];

      // Merge submitted attempts from MySQL with in-memory entries (best score per user)
      const bestByUser = new Map<string, LeaderboardEntryEntity>();

      for (const lb of analyticsDb.leaderboards.values()) {
        if (lb.quizId === quizId) {
          bestByUser.set(lb.userId, lb);
        }
      }

      const dbRows = await withOptionalDb(env, async (db) => {
        return db
          .select({
            attemptId: attemptsTable.id,
            userId: attemptsTable.userId,
            userName: usersTable.name,
            score: attemptsTable.score,
            percentage: attemptsTable.percentage,
            submittedAt: attemptsTable.submittedAt,
          })
          .from(attemptsTable)
          .leftJoin(usersTable, eq(attemptsTable.userId, usersTable.id))
          .where(and(eq(attemptsTable.quizId, quizId), eq(attemptsTable.status, 'SUBMITTED')))
          .orderBy(desc(attemptsTable.score));
      });

      if (dbRows) {
        for (const row of dbRows) {
          const existing = bestByUser.get(row.userId);
          if (!existing || row.score > existing.bestScore) {
            bestByUser.set(row.userId, {
              id: row.attemptId,
              userId: row.userId,
              userName: row.userName || null,
              quizId,
              bestScore: row.score,
              bestPercentage: row.percentage,
              completedAt: row.submittedAt,
              updatedAt: row.submittedAt || new Date(),
            });
          }
        }
      }

      const entries = Array.from(bestByUser.values())
        .sort((a, b) => {
          if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
          return (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0);
        })
        .map((lb, index) => ({
          rank: index + 1,
          userId: lb.userId,
          userName: lb.userName || undefined,
          score: lb.bestScore,
          percentage: lb.bestPercentage,
          completedAt: lb.completedAt,
          updatedAt: lb.updatedAt,
        }));

      return {
        status: 200,
        data: {
          success: true,
          quizId,
          count: entries.length,
          leaderboard: entries,
          data: entries,
          correlationId,
        },
      };
    }

    // =========================================================================
    // 2. LIST ALL BADGES (GET /badges)
    // =========================================================================
    if (path === '/badges' && method === 'GET') {
      const allBadges = Array.from(analyticsDb.badges.values());
      return {
        status: 200,
        data: { success: true, count: allBadges.length, badges: allBadges, data: allBadges, correlationId },
      };
    }

    // =========================================================================
    // 3. GET USER EARNED BADGES (GET /badges/my AND GET /users/me/badges)
    // =========================================================================
    if ((path === '/badges/my' || path === '/users/me/badges') && method === 'GET') {
      if (!userId) {
        return {
          status: 401,
          data: { success: false, error: 'Authentication required (Bearer token missing or invalid)', correlationId },
        };
      }

      const earnedMap = new Map<string, { badge: BadgeEntity; earnedAt: Date }>();

      for (const ub of analyticsDb.userBadges.values()) {
        if (ub.userId === userId) {
          const badge = analyticsDb.badges.get(ub.badgeId);
          if (badge) {
            earnedMap.set(badge.id, { badge, earnedAt: ub.earnedAt });
          }
        }
      }

      // Compute badges from persisted MySQL submitted attempts as well
      const dbAttempts = await withOptionalDb(env, async (db) => {
        return db
          .select({
            percentage: attemptsTable.percentage,
            submittedAt: attemptsTable.submittedAt,
          })
          .from(attemptsTable)
          .where(and(eq(attemptsTable.userId, userId), eq(attemptsTable.status, 'SUBMITTED')));
      });

      if (dbAttempts && dbAttempts.length > 0) {
        const firstBadge = analyticsDb.badges.get('bdg_first_attempt');
        if (firstBadge && !earnedMap.has(firstBadge.id)) {
          earnedMap.set(firstBadge.id, {
            badge: firstBadge,
            earnedAt: dbAttempts[0].submittedAt || new Date(),
          });
        }
        const highScorer = dbAttempts.find((a) => Number(a.percentage) >= 90);
        const goldBadge = analyticsDb.badges.get('bdg_gold');
        if (highScorer && goldBadge && !earnedMap.has(goldBadge.id)) {
          earnedMap.set(goldBadge.id, {
            badge: goldBadge,
            earnedAt: highScorer.submittedAt || new Date(),
          });
        }
      }

      const myBadges = Array.from(earnedMap.values()).map(({ badge, earnedAt }) => ({
        ...badge,
        earnedAt,
      }));

      return {
        status: 200,
        data: {
          success: true,
          userId,
          count: myBadges.length,
          badges: myBadges,
          data: myBadges,
          correlationId,
        },
      };
    }

    // Inter-Service Internal Update: POST /internal/record-attempt-result
    if (path === '/internal/record-attempt-result' && method === 'POST') {
      const { userId: targetUserId, quizId, score, percentage } = body || {};
      if (!targetUserId || !quizId) {
        return { status: 400, data: { success: false, error: 'userId and quizId required', correlationId } };
      }

      const lbKey = `${targetUserId}_${quizId}`;
      const existing = analyticsDb.leaderboards.get(lbKey);

      if (!existing || Number(score) > existing.bestScore) {
        analyticsDb.leaderboards.set(lbKey, {
          id: `lb_${Date.now()}`,
          userId: targetUserId,
          quizId,
          bestScore: Number(score),
          bestPercentage: Number(percentage),
          completedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const firstKey = `${targetUserId}_bdg_first_attempt`;
      if (!analyticsDb.userBadges.has(firstKey)) {
        analyticsDb.userBadges.set(firstKey, {
          userId: targetUserId,
          badgeId: 'bdg_first_attempt',
          earnedAt: new Date(),
        });
      }

      if (Number(percentage) >= 90) {
        const badgeKey = `${targetUserId}_bdg_gold`;
        if (!analyticsDb.userBadges.has(badgeKey)) {
          analyticsDb.userBadges.set(badgeKey, {
            userId: targetUserId,
            badgeId: 'bdg_gold',
            earnedAt: new Date(),
          });
        }
      }

      return { status: 200, data: { success: true, updated: true, correlationId } };
    }

    return { status: 404, data: { success: false, error: `Analytics route '${path}' not found`, correlationId } };
  },
};