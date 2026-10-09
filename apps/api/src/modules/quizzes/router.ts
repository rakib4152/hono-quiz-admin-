/**
 * Quizzes & QuizQuestion API Module
 * Models: Quiz, QuizQuestion
 */

import { dbStore, QuizRecord, QuizQuestionRecord } from '../../services/store.js';

export function handleQuizRoutes(path: string, method: string, body: any, query: URLSearchParams, headers: Headers) {
  // GET /quizzes
  if (path === '/quizzes' && method === 'GET') {
    const examId = query.get('examId');
    const status = query.get('status');

    let list = Array.from(dbStore.quizzes.values());
    if (examId) list = list.filter((q) => q.examId === examId);
    if (status) list = list.filter((q) => q.status === status);

    const enriched = list.map((quiz) => {
      const qCount = Array.from(dbStore.quizQuestions.values()).filter((qq) => qq.quizId === quiz.id).length;
      const exam = dbStore.exams.get(quiz.examId);
      return {
        ...quiz,
        totalQuestions: qCount,
        examName: exam?.name || 'Standard Exam',
      };
    });

    return { status: 200, data: { success: true, count: enriched.length, data: enriched } };
  }

  // POST /quizzes
  if (path === '/quizzes' && method === 'POST') {
    const {
      examId,
      title,
      slug,
      description,
      status = 'DRAFT',
      price = 0,
      currency = 'BDT',
      durationSeconds = 3600,
      passPercentage = 50,
      shuffleQuestions = false,
      shuffleOptions = false,
      negativeMark = 0.25,
      maxAttempts = null,
    } = body || {};

    if (!examId || !title || !slug) {
      return { status: 400, data: { success: false, error: 'examId, title and slug are required' } };
    }

    const newQuiz: QuizRecord = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      examId,
      title,
      slug,
      description: description || null,
      status: status as any,
      price: Number(price),
      currency,
      durationSeconds: durationSeconds ? Number(durationSeconds) : null,
      passPercentage: passPercentage ? Number(passPercentage) : null,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      negativeMark: Number(negativeMark),
      maxAttempts: maxAttempts ? Number(maxAttempts) : null,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbStore.quizzes.set(newQuiz.id, newQuiz);

    return { status: 201, data: { success: true, data: newQuiz } };
  }

  // Assign questions: POST /quizzes/:id/questions
  const matchAssignQuestions = path.match(/^\/quizzes\/([^/]+)\/questions$/);
  if (matchAssignQuestions && method === 'POST') {
    const quizId = matchAssignQuestions[1];
    const quiz = dbStore.quizzes.get(quizId);
    if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found' } };

    const { questionId, position = 1, marks } = body || {};
    if (!questionId) return { status: 400, data: { success: false, error: 'questionId is required' } };

    const key = `${quizId}_${questionId}`;
    const quizQuestion: QuizQuestionRecord = {
      quizId,
      questionId,
      position: Number(position),
      marks: marks !== undefined ? Number(marks) : null,
    };
    dbStore.quizQuestions.set(key, quizQuestion);

    return { status: 200, data: { success: true, data: quizQuestion } };
  }

  // Single Quiz: /quizzes/:id
  const matchQuizId = path.match(/^\/quizzes\/([^/]+)$/);
  if (matchQuizId) {
    const id = matchQuizId[1];
    const quiz = dbStore.quizzes.get(id);
    if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found' } };

    if (method === 'GET') {
      // Gather linked questions ordered by position
      const assigned = Array.from(dbStore.quizQuestions.values())
        .filter((qq) => qq.quizId === id)
        .sort((a, b) => a.position - b.position);

      const questionsList = assigned
        .map((qq) => {
          const q = dbStore.questions.get(qq.questionId);
          if (!q) return null;
          // Options
          const opts = Array.from(dbStore.options.values())
            .filter((o) => o.questionId === q.id)
            .sort((a, b) => a.position - b.position)
            .map((o) => ({
              id: o.id,
              text: o.text,
              imageUrl: o.imageUrl,
              position: o.position,
              // Never leak isCorrect to student takers!
            }));
          return {
            ...q,
            position: qq.position,
            quizMarks: qq.marks || q.marks,
            options: opts,
          };
        })
        .filter(Boolean);

      return {
        status: 200,
        data: {
          success: true,
          data: {
            ...quiz,
            totalQuestions: questionsList.length,
            questions: questionsList,
          },
        },
      };
    }

    if (method === 'PATCH') {
      const updated: QuizRecord = {
        ...quiz,
        ...body,
        updatedAt: new Date(),
      };
      if (body.status === 'PUBLISHED' && !quiz.publishedAt) {
        updated.publishedAt = new Date();
      }
      dbStore.quizzes.set(id, updated);
      return { status: 200, data: { success: true, data: updated } };
    }
  }

  return null;
}
