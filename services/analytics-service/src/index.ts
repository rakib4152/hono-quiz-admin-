/**
 * Microservice: Analytics & Leaderboard Service
 * Database: analytics_db (Badge, UserBadge, LeaderboardEntry)
 * Responsibilities: Event-driven updates, deterministic tie-breaking, badges
 */

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

// Seed badges
analyticsDb.badges.set('bdg_gold', {
  id: 'bdg_gold',
  name: 'National Top 10% Ranker',
  description: 'Scored 90%+ in a national preliminary model examination.',
  imageUrl: 'https://assets.example.com/badges/gold.png',
});

analyticsDb.badges.set('bdg_streak', {
  id: 'bdg_streak',
  name: '7-Day Examination Streak',
  description: 'Completed at least one daily timed quiz for 7 consecutive days.',
  imageUrl: 'https://assets.example.com/badges/streak.png',
});

// Seed demo leaderboard entries
analyticsDb.leaderboards.set('usr_student1_quiz_bcs_model_01', {
  id: 'lb_1',
  userId: 'usr_student1',
  quizId: 'quiz_bcs_model_01',
  bestScore: 165.5,
  bestPercentage: 82.75,
  completedAt: new Date(),
  updatedAt: new Date(),
});

export const analyticsService = {
  async handle(req: { path: string; method: string; body?: any; correlationId: string; userId?: string }) {
    const { path, method, body, correlationId, userId = 'usr_student1' } = req;

    // GET /leaderboards/quizzes/:quizId
    const matchQuizLb = path.match(/^\/leaderboards\/quizzes\/([^/]+)$/);
    if (matchQuizLb && method === 'GET') {
      const quizId = matchQuizLb[1];
      const entries = Array.from(analyticsDb.leaderboards.values())
        .filter((lb) => lb.quizId === quizId)
        .sort((a, b) => {
          // Deterministic tie-breaking: higher score, then earlier completion timestamp
          if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
          return (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0);
        })
        .map((lb, index) => ({
          rank: index + 1,
          userId: lb.userId,
          score: lb.bestScore,
          percentage: lb.bestPercentage,
          completedAt: lb.completedAt,
        }));

      return { status: 200, data: { success: true, count: entries.length, leaderboard: entries, correlationId } };
    }

    // GET /badges
    if (path === '/badges' && method === 'GET') {
      return { status: 200, data: { success: true, data: Array.from(analyticsDb.badges.values()), correlationId } };
    }

    // GET /users/me/badges
    if (path === '/users/me/badges' && method === 'GET') {
      const myBadges = Array.from(analyticsDb.userBadges.values())
        .filter((ub) => ub.userId === userId)
        .map((ub) => analyticsDb.badges.get(ub.badgeId))
        .filter(Boolean);

      return { status: 200, data: { success: true, data: myBadges, correlationId } };
    }

    // Inter-Service Internal Update: /internal/record-attempt-result
    if (path === '/internal/record-attempt-result' && method === 'POST') {
      const { userId: targetUserId, quizId, score, percentage } = body || {};
      const lbKey = `${targetUserId}_${quizId}`;
      const existing = analyticsDb.leaderboards.get(lbKey);

      if (!existing || score > existing.bestScore) {
        analyticsDb.leaderboards.set(lbKey, {
          id: `lb_${Date.now()}`,
          userId: targetUserId,
          quizId,
          bestScore: score,
          bestPercentage: percentage,
          completedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Check badge qualification
      if (percentage >= 90) {
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

    return { status: 404, data: { success: false, error: 'Analytics route not found', correlationId } };
  },
};
