import type { KVNamespaceLike } from '../../../apps/src/env.js';

/**
 * Cache Invalidation Helper for Cloudflare KV (CACHE_KV)
 * Safely purges cached responses after write operations (create, update, delete, publish).
 */
export async function invalidateQuizCache(kv?: KVNamespaceLike, options: { quizId?: string; questionId?: string; examId?: string } = {}) {
  if (!kv) return;

  const targetKeys: string[] = [
    'quizzes:all',
    'quizzes:list',
    'quizzes:public',
    'categories:all',
    'categories:list',
    'exams:all',
    'exams:list',
  ];

  if (options.quizId) {
    targetKeys.push(
      `quiz:${options.quizId}`,
      `quiz:${options.quizId}:full`,
      `quiz:${options.quizId}:questions`,
      `quiz:${options.quizId}:offline-package`,
      `quizzes:${options.quizId}`
    );
  }

  if (options.questionId) {
    targetKeys.push(`question:${options.questionId}`);
  }

  if (options.examId) {
    targetKeys.push(`exam:${options.examId}:quizzes`);
  }

  try {
    await Promise.allSettled(targetKeys.map((key) => kv.delete(key)));
  } catch (err) {
    console.warn('[Cache Invalidation Warning] Failed to delete KV keys:', err);
  }
}
