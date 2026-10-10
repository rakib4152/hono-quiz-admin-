/**
 * Microservice: Quiz Content Service
 * Database: quiz_db (Category, Exam, Subject, Topic, Quiz, Question, Option, QuizQuestion)
 * Responsibilities: Content authoring, taxonomy, offline content packages, CSV import/export
 */

import { QuizStatus } from '../../../packages/shared-types/src/index.js';

interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExamEntity {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
}

interface SubjectEntity {
  id: string;
  name: string;
  slug: string;
}

interface TopicEntity {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
}

interface QuizEntity {
  id: string;
  examId: string;
  title: string;
  slug: string;
  description: string | null;
  status: QuizStatus;
  price: number;
  currency: string;
  durationSeconds: number | null;
  passPercentage: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMark: number;
  maxAttempts: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionEntity {
  id: string;
  subjectId: string;
  topicId: string | null;
  body: string;
  explanation: string | null;
  difficulty: number;
  marks: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OptionEntity {
  id: string;
  questionId: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  position: number;
}

interface QuizQuestionEntity {
  quizId: string;
  questionId: string;
  position: number;
  marks: number | null;
}

export const quizDb = {
  categories: new Map<string, CategoryEntity>(),
  exams: new Map<string, ExamEntity>(),
  subjects: new Map<string, SubjectEntity>(),
  topics: new Map<string, TopicEntity>(),
  quizzes: new Map<string, QuizEntity>(),
  questions: new Map<string, QuestionEntity>(),
  options: new Map<string, OptionEntity>(),
  quizQuestions: new Map<string, QuizQuestionEntity>(),
};

// Seed initial content data
const catJob: CategoryEntity = {
  id: 'cat_job_prep',
  name: 'Job Preparation (চাকরি প্রস্তুতি)',
  slug: 'job-preparation',
  createdAt: new Date(),
  updatedAt: new Date(),
};
quizDb.categories.set(catJob.id, catJob);

const examBCS: ExamEntity = {
  id: 'exam_bcs_46',
  categoryId: catJob.id,
  name: '46th BCS Preliminary (৪৬তম বিসিএস)',
  slug: '46th-bcs-preliminary',
  description: 'National preliminary examination model tests.',
};
quizDb.exams.set(examBCS.id, examBCS);

const subMath: SubjectEntity = {
  id: 'sub_math',
  name: 'Mathematics & Mental Ability (গণিত)',
  slug: 'math',
};
quizDb.subjects.set(subMath.id, subMath);

const topAlg: TopicEntity = {
  id: 'top_algebra',
  subjectId: subMath.id,
  name: 'Algebraic Formulas (বীজগণিত)',
  slug: 'algebra',
};
quizDb.topics.set(topAlg.id, topAlg);

// Questions & Options
const q1: QuestionEntity = {
  id: 'q_alg_01',
  subjectId: subMath.id,
  topicId: topAlg.id,
  body: 'If x + y = 7 and xy = 10, what is the value of (x - y)^2? (যদি x + y = 7 এবং xy = 10 হয়, তবে (x - y)^2 এর মান কত?)',
  explanation: '(x - y)^2 = (x + y)^2 - 4xy = 7^2 - 4(10) = 49 - 40 = 9.',
  difficulty: 2,
  marks: 1.0,
  imageUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
quizDb.questions.set(q1.id, q1);

const q1_opts: OptionEntity[] = [
  { id: 'opt_1a', questionId: q1.id, text: '9 (৯)', imageUrl: null, isCorrect: true, position: 1 },
  { id: 'opt_1b', questionId: q1.id, text: '14 (১৪)', imageUrl: null, isCorrect: false, position: 2 },
  { id: 'opt_1c', questionId: q1.id, text: '29 (২৯)', imageUrl: null, isCorrect: false, position: 3 },
  { id: 'opt_1d', questionId: q1.id, text: '49 (৪৯)', imageUrl: null, isCorrect: false, position: 4 },
];
q1_opts.forEach((o) => quizDb.options.set(o.id, o));

// Quiz
const quizModel1: QuizEntity = {
  id: 'quiz_bcs_model_01',
  examId: examBCS.id,
  title: '46th BCS Preliminary Model Test 01',
  slug: '46th-bcs-prelim-model-01',
  description: 'Full timed examination with negative marks.',
  status: 'PUBLISHED',
  price: 150,
  currency: 'BDT',
  durationSeconds: 3600,
  passPercentage: 50.0,
  shuffleQuestions: true,
  shuffleOptions: false,
  negativeMark: 0.25,
  maxAttempts: 3,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};
quizDb.quizzes.set(quizModel1.id, quizModel1);

quizDb.quizQuestions.set(`${quizModel1.id}_${q1.id}`, {
  quizId: quizModel1.id,
  questionId: q1.id,
  position: 1,
  marks: 1.0,
});

export const quizService = {
  async handle(req: { path: string; method: string; body?: any; query?: URLSearchParams; correlationId: string; userRole?: string }) {
    const { path, method, body, query, correlationId, userRole } = req;

    // GET /categories
    if (path === '/categories' && method === 'GET') {
      return { status: 200, data: { success: true, data: Array.from(quizDb.categories.values()), correlationId } };
    }

    // GET /exams
    if (path === '/exams' && method === 'GET') {
      const examsList = Array.from(quizDb.exams.values()).map((e) => {
        const cat = quizDb.categories.get(e.categoryId);
        const count = Array.from(quizDb.quizzes.values()).filter((q) => q.examId === e.id).length;
        return { ...e, categoryName: cat?.name || 'General', quizzesCount: count, status: 'ACTIVE' };
      });
      return { status: 200, data: { success: true, count: examsList.length, data: examsList, correlationId } };
    }

    // GET /subjects
    if (path === '/subjects' && method === 'GET') {
      return { status: 200, data: { success: true, data: Array.from(quizDb.subjects.values()), correlationId } };
    }

    // GET /topics
    if (path === '/topics' && method === 'GET') {
      return { status: 200, data: { success: true, data: Array.from(quizDb.topics.values()), correlationId } };
    }

    // GET /questions
    if (path === '/questions' && method === 'GET') {
      return { status: 200, data: { success: true, count: quizDb.questions.size, data: Array.from(quizDb.questions.values()), correlationId } };
    }

    // GET /quizzes
    if (path === '/quizzes' && method === 'GET') {
      const list = Array.from(quizDb.quizzes.values()).map((q) => {
        const exam = quizDb.exams.get(q.examId);
        const count = Array.from(quizDb.quizQuestions.values()).filter((qq) => qq.quizId === q.id).length;
        return { ...q, examName: exam?.name || 'Exam', totalQuestions: count };
      });
      return { status: 200, data: { success: true, count: list.length, data: list, correlationId } };
    }

    // GET /quizzes/:quizId
    const matchQuiz = path.match(/^\/quizzes\/([^/]+)$/);
    if (matchQuiz && method === 'GET') {
      const quizId = matchQuiz[1];
      const quiz = quizDb.quizzes.get(quizId);
      if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };

      const assigned = Array.from(quizDb.quizQuestions.values())
        .filter((qq) => qq.quizId === quizId)
        .sort((a, b) => a.position - b.position);

      const questions = assigned.map((qq) => {
        const q = quizDb.questions.get(qq.questionId);
        if (!q) return null;
        const opts = Array.from(quizDb.options.values())
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.position - b.position)
          .map((o) => ({
            id: o.id,
            text: o.text,
            imageUrl: o.imageUrl,
            position: o.position,
            // Security: Never leak isCorrect before submission unless caller is ADMIN/EDITOR
            isCorrect: userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? o.isCorrect : undefined,
          }));

        return {
          id: q.id,
          position: qq.position,
          body: q.body,
          marks: qq.marks || q.marks,
          options: opts,
        };
      }).filter(Boolean);

      return { status: 200, data: { success: true, data: { ...quiz, questions }, correlationId } };
    }

    // GET /quizzes/:quizId/offline-package
    const matchOfflinePkg = path.match(/^\/quizzes\/([^/]+)\/offline-package$/);
    if (matchOfflinePkg && method === 'GET') {
      const quizId = matchOfflinePkg[1];
      const quiz = quizDb.quizzes.get(quizId);
      if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };

      const questions = Array.from(quizDb.quizQuestions.values())
        .filter((qq) => qq.quizId === quizId)
        .map((qq) => {
          const q = quizDb.questions.get(qq.questionId);
          if (!q) return null;
          const opts = Array.from(quizDb.options.values())
            .filter((o) => o.questionId === q.id)
            .map((o) => ({ id: o.id, text: o.text, position: o.position })); // Answers strictly excluded
          return { id: q.id, position: qq.position, body: q.body, marks: qq.marks || q.marks, options: opts };
        }).filter(Boolean);

      return {
        status: 200,
        data: {
          success: true,
          offlinePackage: {
            packageVersion: 'v1.0.0',
            generatedAt: new Date().toISOString(),
            quiz: { id: quiz.id, title: quiz.title, durationSeconds: quiz.durationSeconds, negativeMark: quiz.negativeMark },
            questions,
          },
          correlationId,
        },
      };
    }

    // Inter-Service Internal Query: Fetch questions with correct answers for authoritative scoring in attempt-service
    if (path === '/internal/quiz-scoring-keys' && method === 'POST') {
      const targetQuizId = body?.quizId;
      const quiz = quizDb.quizzes.get(targetQuizId);
      if (!quiz) return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };

      const keys = Array.from(quizDb.quizQuestions.values())
        .filter((qq) => qq.quizId === targetQuizId)
        .map((qq) => {
          const q = quizDb.questions.get(qq.questionId);
          const correctOpt = Array.from(quizDb.options.values()).find((o) => o.questionId === qq.questionId && o.isCorrect);
          return {
            questionId: qq.questionId,
            marks: qq.marks || q?.marks || 1.0,
            correctOptionId: correctOpt?.id || null,
          };
        });

      return {
        status: 200,
        data: {
          success: true,
          quiz: { id: quiz.id, negativeMark: quiz.negativeMark, passPercentage: quiz.passPercentage, price: quiz.price },
          keys,
          correlationId,
        },
      };
    }

    return { status: 404, data: { success: false, error: 'Quiz route not found', correlationId } };
  },
};
