/**
 * Questions & Options API Module
 * Models: Question, Option
 */

import { dbStore, QuestionRecord, OptionRecord } from '../../services/store.js';

export function handleQuestionRoutes(path: string, method: string, body: any, query: URLSearchParams) {
  // GET /questions
  if (path === '/questions' && method === 'GET') {
    const subjectId = query.get('subjectId');
    const topicId = query.get('topicId');
    const difficulty = query.get('difficulty');
    const search = query.get('search')?.toLowerCase();

    let list = Array.from(dbStore.questions.values());

    if (subjectId) list = list.filter((q) => q.subjectId === subjectId);
    if (topicId) list = list.filter((q) => q.topicId === topicId);
    if (difficulty) list = list.filter((q) => q.difficulty === parseInt(difficulty, 10));
    if (search) list = list.filter((q) => q.body.toLowerCase().includes(search));

    // Attach options
    const enriched = list.map((q) => {
      const opts = Array.from(dbStore.options.values())
        .filter((o) => o.questionId === q.id)
        .sort((a, b) => a.position - b.position);
      return { ...q, options: opts };
    });

    return { status: 200, data: { success: true, count: enriched.length, data: enriched } };
  }

  // POST /questions
  if (path === '/questions' && method === 'POST') {
    const {
      subjectId,
      topicId,
      body: questionBody,
      explanation,
      difficulty = 1,
      marks = 1.0,
      imageUrl,
      options = [],
    } = body || {};

    if (!subjectId || !questionBody || !options.length) {
      return { status: 400, data: { success: false, error: 'subjectId, body and options are required' } };
    }

    const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newQuestion: QuestionRecord = {
      id: questionId,
      subjectId,
      topicId: topicId || null,
      body: questionBody,
      explanation: explanation || null,
      difficulty: Number(difficulty),
      marks: Number(marks),
      imageUrl: imageUrl || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbStore.questions.set(newQuestion.id, newQuestion);

    // Save Options
    const createdOptions: OptionRecord[] = options.map((opt: any, index: number) => {
      const optRecord: OptionRecord = {
        id: `opt_${Date.now()}_${index}`,
        questionId,
        text: opt.text,
        imageUrl: opt.imageUrl || null,
        isCorrect: Boolean(opt.isCorrect),
        position: opt.position !== undefined ? opt.position : index + 1,
      };
      dbStore.options.set(optRecord.id, optRecord);
      return optRecord;
    });

    return {
      status: 201,
      data: {
        success: true,
        data: { ...newQuestion, options: createdOptions },
      },
    };
  }

  // GET /questions/:id
  const matchId = path.match(/^\/questions\/([^/]+)$/);
  if (matchId) {
    const id = matchId[1];

    if (method === 'GET') {
      const q = dbStore.questions.get(id);
      if (!q) return { status: 404, data: { success: false, error: 'Question not found' } };
      const opts = Array.from(dbStore.options.values())
        .filter((o) => o.questionId === q.id)
        .sort((a, b) => a.position - b.position);
      return { status: 200, data: { success: true, data: { ...q, options: opts } } };
    }

    if (method === 'PATCH') {
      const q = dbStore.questions.get(id);
      if (!q) return { status: 404, data: { success: false, error: 'Question not found' } };
      const updated: QuestionRecord = {
        ...q,
        ...body,
        updatedAt: new Date(),
      };
      dbStore.questions.set(id, updated);
      return { status: 200, data: { success: true, data: updated } };
    }

    if (method === 'DELETE') {
      if (!dbStore.questions.has(id)) {
        return { status: 404, data: { success: false, error: 'Question not found' } };
      }
      dbStore.questions.delete(id);
      // Delete child options
      for (const [optId, opt] of dbStore.options.entries()) {
        if (opt.questionId === id) dbStore.options.delete(optId);
      }
      return { status: 200, data: { success: true, message: 'Question and options deleted' } };
    }
  }

  return null;
}
