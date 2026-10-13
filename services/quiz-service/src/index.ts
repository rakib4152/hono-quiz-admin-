/**
 * Microservice: Quiz Content Service
 * Database: Hostinger MySQL (u427015050_quiz) via Prisma ORM / Hyperdrive
 * Models: Category, Exam, Subject, Topic, Quiz, Question, Option, QuizQuestion
 * Responsibilities: Content authoring, taxonomy, offline content packages, scoring keys
 * 
 * Strict Persistence Rule:
 * - Write operations (POST, PUT, PATCH, DELETE) MUST write directly to MySQL via Prisma.
 * - Silent in-memory fallbacks are REMOVED for all writes.
 * - Connection and query errors return explicit HTTP 500/409 responses with full diagnostic logs.
 */

import { QuizStatus } from '../../../packages/shared-types/src/index.js';
import {
  getPrismaClient,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
  type PrismaClient,
} from '../../../packages/database/src/index.js';

export {
  getPrismaClient,
  resolveDatabaseUrl,
  verifyDatabaseConnection,
  type PrismaClient,
};

// In-memory fallback dataset retained exclusively for read-only staging previews when offline
export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamEntity {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface SubjectEntity {
  id: string;
  name: string;
  slug: string;
}

export interface TopicEntity {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
}

export interface QuizEntity {
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

export interface QuestionEntity {
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

export interface OptionEntity {
  id: string;
  questionId: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  position: number;
}

export interface QuizQuestionEntity {
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

// Seed initial content data for fallback reads
const cat1: CategoryEntity = {
  id: 'cat_bcs',
  name: 'Bangladesh Civil Service (BCS)',
  slug: 'bcs',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const cat2: CategoryEntity = {
  id: 'cat_bank',
  name: 'Bank Recruitment Exams',
  slug: 'bank-recruitment',
  createdAt: new Date(),
  updatedAt: new Date(),
};
quizDb.categories.set(cat1.id, cat1);
quizDb.categories.set(cat2.id, cat2);

const exam1: ExamEntity = {
  id: 'exam_47_bcs',
  categoryId: cat1.id,
  name: '47th BCS Preliminary Examination',
  slug: '47th-bcs-preliminary',
  description: 'Comprehensive 200 marks preliminary assessment according to BPSC syllabus',
};
quizDb.exams.set(exam1.id, exam1);

const sub1: SubjectEntity = {
  id: 'sub_bangla',
  name: 'Bangla Language & Literature',
  slug: 'bangla-language-literature',
};
const sub2: SubjectEntity = {
  id: 'sub_english',
  name: 'English Language & Literature',
  slug: 'english-language-literature',
};
quizDb.subjects.set(sub1.id, sub1);
quizDb.subjects.set(sub2.id, sub2);

const top1: TopicEntity = {
  id: 'top_bangla_gram',
  subjectId: sub1.id,
  name: 'Bangla Grammar & Syntax (ব্যাকরণ)',
  slug: 'bangla-grammar',
};
quizDb.topics.set(top1.id, top1);

const q1: QuestionEntity = {
  id: 'q_001',
  subjectId: sub1.id,
  topicId: top1.id,
  body: '‘চর্যাপদ’ কোন ছন্দে রচিত?',
  explanation: 'চর্যাপদ প্রধানত মাত্রাবৃত্ত ছন্দে (পাদাকুলক ছন্দ) রচিত হয়েছে। এটি হরপ্রসাদ শাস্ত্রী ১৯০৭ সালে নেপাল থেকে আবিষ্কার করেন।',
  difficulty: 2,
  marks: 1.0,
  imageUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
quizDb.questions.set(q1.id, q1);

quizDb.options.set('opt_001_1', { id: 'opt_001_1', questionId: q1.id, text: 'অক্ষরবৃত্ত ছন্দ', imageUrl: null, isCorrect: false, position: 1 });
quizDb.options.set('opt_001_2', { id: 'opt_001_2', questionId: q1.id, text: 'মাত্রাবৃত্ত ছন্দ (পাদাকুলক)', imageUrl: null, isCorrect: true, position: 2 });
quizDb.options.set('opt_001_3', { id: 'opt_001_3', questionId: q1.id, text: 'স্বরবৃত্ত ছন্দ', imageUrl: null, isCorrect: false, position: 3 });
quizDb.options.set('opt_001_4', { id: 'opt_001_4', questionId: q1.id, text: 'অমিত্রাক্ষর ছন্দ', imageUrl: null, isCorrect: false, position: 4 });

const quizModel1: QuizEntity = {
  id: 'quiz_bcs_model_01',
  examId: exam1.id,
  title: '47th BCS Preliminary Live Mock Test - 01',
  slug: '47th-bcs-preliminary-live-mock-01',
  description: 'Full-length 200 marks live simulation with real-time percentile ranking and negative marking.',
  status: 'PUBLISHED',
  price: 0,
  currency: 'BDT',
  durationSeconds: 7200,
  passPercentage: 50.0,
  shuffleQuestions: true,
  shuffleOptions: true,
  negativeMark: 0.5,
  maxAttempts: 1,
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

/**
 * Diagnostic helper to format Prisma errors consistently with HTTP status codes
 */
function handlePrismaWriteError(
  dbErr: any,
  operation: string,
  correlationId: string
) {
  console.error(`[Prisma Database Error] Write failed for ${operation}:`, {
    message: dbErr?.message,
    code: dbErr?.code,
    meta: dbErr?.meta,
    name: dbErr?.name,
    stack: dbErr?.stack,
  });

  // Unique constraint violation (e.g. slug or name duplicate in MySQL)
  if (dbErr?.code === 'P2002') {
    const target = Array.isArray(dbErr?.meta?.target)
      ? dbErr.meta.target.join(', ')
      : dbErr?.meta?.target || 'field';
    return {
      status: 409,
      data: {
        success: false,
        error: `Unique constraint violation: A record with this ${target} already exists in Hostinger MySQL.`,
        code: 'P2002',
        target,
        correlationId,
      },
    };
  }

  // Foreign key constraint failed (e.g. invalid categoryId or examId)
  if (dbErr?.code === 'P2003') {
    return {
      status: 400,
      data: {
        success: false,
        error: `Foreign key constraint failed on ${dbErr?.meta?.field_name || 'relation'}. Verify that the referenced record exists.`,
        code: 'P2003',
        correlationId,
      },
    };
  }

  // Record not found during update/delete
  if (dbErr?.code === 'P2025') {
    return {
      status: 404,
      data: {
        success: false,
        error: 'The requested record was not found in the database.',
        code: 'P2025',
        correlationId,
      },
    };
  }

  // Database connection failure (P1001: Connection refused, P1002: Connection timed out, P1003: Database does not exist)
  if (dbErr?.code && dbErr.code.startsWith('P1')) {
    return {
      status: 500,
      data: {
        success: false,
        error: `Cannot connect to Hostinger MySQL (u427015050_quiz): ${dbErr.message}`,
        code: dbErr.code,
        diagnostic: {
          hint: 'Ensure remote MySQL access is allowed for your worker IP in Hostinger hPanel > Databases > Remote MySQL.',
          database: 'u427015050_quiz',
        },
        correlationId,
      },
    };
  }

  // Generic Prisma execution error - return real error message instead of faking success
  return {
    status: 500,
    data: {
      success: false,
      error: dbErr?.message || 'Database execution failure in Prisma ORM',
      code: dbErr?.code || 'PRISMA_EXECUTION_ERROR',
      meta: dbErr?.meta,
      correlationId,
    },
  };
}

export const quizService = {
  async handle(req: {
    path: string;
    method: string;
    body?: any;
    query?: URLSearchParams;
    correlationId: string;
    userRole?: string;
    prisma?: PrismaClient;
  }): Promise<{ status: number; data: any }> {
    const { path, method, body, query, correlationId, userRole, prisma } = req;

    // Helper: Require Prisma database client for state-mutating write operations
    const requirePrisma = () => {
      if (!prisma) {
        console.error('[Prisma Guard] State-mutating write rejected: PrismaClient is not configured.');
        return {
          status: 500,
          data: {
            success: false,
            error: 'Hostinger MySQL database connection is not configured. DATABASE_URL or HYPERDRIVE binding missing.',
            code: 'DB_CLIENT_UNAVAILABLE',
            diagnostic: {
              targetDatabase: 'u427015050_quiz',
              actionRequired: 'Provide DATABASE_URL in wrangler.jsonc or .env to connect to Hostinger MySQL.',
            },
            correlationId,
          },
        };
      }
      return null;
    };

    // -------------------------------------------------------------
    // DIAGNOSTIC ENDPOINT: GET /db-health
    // -------------------------------------------------------------
    if (path === '/db-health' && method === 'GET') {
      if (!prisma) {
        return {
          status: 500,
          data: {
            success: false,
            connected: false,
            error: 'Prisma client is not initialized. Please verify DATABASE_URL or HYPERDRIVE binding.',
            targetDatabase: 'u427015050_quiz',
            correlationId,
          },
        };
      }
      const probe = await verifyDatabaseConnection(prisma);
      return {
        status: probe.ok ? 200 : 500,
        data: {
          success: probe.ok,
          connected: probe.ok,
          latencyMs: probe.latencyMs,
          targetDatabase: 'u427015050_quiz',
          error: probe.error,
          correlationId,
        },
      };
    }

    // -------------------------------------------------------------
    // CATEGORIES
    // -------------------------------------------------------------

    // GET /categories
    if (path === '/categories' && method === 'GET') {
      if (prisma) {
        try {
          const categories = await prisma.category.findMany({
            include: {
              _count: {
                select: { exams: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          return {
            status: 200,
            data: {
              success: true,
              source: 'mysql',
              count: categories.length,
              data: categories,
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /categories query failed:', dbErr);
          return {
            status: 500,
            data: {
              success: false,
              error: `Failed to fetch categories from Hostinger MySQL: ${dbErr?.message}`,
              code: dbErr?.code || 'DB_READ_ERROR',
              correlationId,
            },
          };
        }
      }

      // Read fallback only if prisma binding is explicitly absent
      return {
        status: 200,
        data: {
          success: true,
          source: 'in-memory-fallback',
          count: quizDb.categories.size,
          data: Array.from(quizDb.categories.values()),
          correlationId,
        },
      };
    }

    // POST /categories (STRICT WRITE: Guaranteed MySQL or 500/409 error)
    if (path === '/categories' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const { name, slug } = body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return {
          status: 400,
          data: { success: false, error: 'Category name is required', correlationId },
        };
      }

      const categorySlug =
        (slug && typeof slug === 'string' && slug.trim()) ||
        name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      try {
        const created = await prisma!.category.create({
          data: {
            name: name.trim(),
            slug: categorySlug,
          },
        });

        // Mirror to local cache purely for hot reads, never masking write
        quizDb.categories.set(created.id, {
          id: created.id,
          name: created.name,
          slug: created.slug,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        });

        return {
          status: 201,
          data: {
            success: true,
            persistedToDatabase: true,
            database: 'u427015050_quiz',
            data: created,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'category.create', correlationId);
      }
    }

    // DELETE /categories/:id
    const matchCategoryDelete = path.match(/^\/categories\/([^/]+)$/);
    if (matchCategoryDelete && method === 'DELETE') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const categoryId = matchCategoryDelete[1];
      try {
        await prisma!.category.delete({
          where: { id: categoryId },
        });
        quizDb.categories.delete(categoryId);
        return {
          status: 200,
          data: {
            success: true,
            deletedId: categoryId,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, `category.delete(${categoryId})`, correlationId);
      }
    }

    // -------------------------------------------------------------
    // EXAMS
    // -------------------------------------------------------------

    // GET /exams
    if (path === '/exams' && method === 'GET') {
      if (prisma) {
        try {
          const exams = await prisma.exam.findMany({
            include: {
              category: true,
              _count: {
                select: { quizzes: true },
              },
            },
            orderBy: { name: 'asc' },
          });
          const mappedExams = exams.map((e: any) => ({
            id: e.id,
            categoryId: e.categoryId,
            name: e.name,
            slug: e.slug,
            description: e.description,
            categoryName: e.category?.name || 'General',
            quizzesCount: e._count?.quizzes || 0,
            status: 'ACTIVE',
          }));
          return {
            status: 200,
            data: {
              success: true,
              source: 'mysql',
              count: mappedExams.length,
              data: mappedExams,
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /exams query failed:', dbErr);
          return {
            status: 500,
            data: {
              success: false,
              error: `Failed to fetch exams from Hostinger MySQL: ${dbErr?.message}`,
              code: dbErr?.code || 'DB_READ_ERROR',
              correlationId,
            },
          };
        }
      }

      const examsList = Array.from(quizDb.exams.values()).map((e) => {
        const cat = quizDb.categories.get(e.categoryId);
        const count = Array.from(quizDb.quizzes.values()).filter((q) => q.examId === e.id).length;
        return { ...e, categoryName: cat?.name || 'General', quizzesCount: count, status: 'ACTIVE' };
      });
      return {
        status: 200,
        data: {
          success: true,
          source: 'in-memory-fallback',
          count: examsList.length,
          data: examsList,
          correlationId,
        },
      };
    }

    // POST /exams (STRICT WRITE: Guaranteed MySQL or 500/409 error)
    if (path === '/exams' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const { categoryId, name, slug, description } = body || {};
      if (!categoryId || !name) {
        return {
          status: 400,
          data: { success: false, error: 'categoryId and name are required', correlationId },
        };
      }

      const examSlug =
        (slug && typeof slug === 'string' && slug.trim()) ||
        name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      try {
        const created = await prisma!.exam.create({
          data: {
            categoryId,
            name: name.trim(),
            slug: examSlug,
            description: description || null,
          },
          include: {
            category: true,
          },
        });

        quizDb.exams.set(created.id, {
          id: created.id,
          categoryId: created.categoryId,
          name: created.name,
          slug: created.slug,
          description: created.description,
        });

        return {
          status: 201,
          data: {
            success: true,
            persistedToDatabase: true,
            database: 'u427015050_quiz',
            data: created,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'exam.create', correlationId);
      }
    }

    // DELETE /exams/:id
    const matchExamDelete = path.match(/^\/exams\/([^/]+)$/);
    if (matchExamDelete && method === 'DELETE') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const examId = matchExamDelete[1];
      try {
        await prisma!.exam.delete({
          where: { id: examId },
        });
        quizDb.exams.delete(examId);
        return {
          status: 200,
          data: {
            success: true,
            deletedId: examId,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, `exam.delete(${examId})`, correlationId);
      }
    }

    // -------------------------------------------------------------
    // SUBJECTS & TOPICS
    // -------------------------------------------------------------

    // GET /subjects
    if (path === '/subjects' && method === 'GET') {
      if (prisma) {
        try {
          const subjects = await prisma.subject.findMany({
            include: {
              topics: true,
              _count: { select: { questions: true } },
            },
            orderBy: { name: 'asc' },
          });
          return {
            status: 200,
            data: { success: true, source: 'mysql', data: subjects, correlationId },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /subjects failed:', dbErr);
          return {
            status: 500,
            data: { success: false, error: dbErr?.message, correlationId },
          };
        }
      }
      return {
        status: 200,
        data: { success: true, source: 'in-memory-fallback', data: Array.from(quizDb.subjects.values()), correlationId },
      };
    }

    // POST /subjects
    if (path === '/subjects' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const { name, slug } = body || {};
      if (!name) {
        return { status: 400, data: { success: false, error: 'Subject name is required', correlationId } };
      }
      const subjectSlug = slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      try {
        const created = await prisma!.subject.create({
          data: { name: name.trim(), slug: subjectSlug },
        });
        return {
          status: 201,
          data: { success: true, persistedToDatabase: true, data: created, correlationId },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'subject.create', correlationId);
      }
    }

    // GET /topics
    if (path === '/topics' && method === 'GET') {
      if (prisma) {
        try {
          const topics = await prisma.topic.findMany({
            include: { subject: true },
            orderBy: { name: 'asc' },
          });
          return {
            status: 200,
            data: { success: true, source: 'mysql', data: topics, correlationId },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /topics failed:', dbErr);
          return {
            status: 500,
            data: { success: false, error: dbErr?.message, correlationId },
          };
        }
      }
      return {
        status: 200,
        data: { success: true, source: 'in-memory-fallback', data: Array.from(quizDb.topics.values()), correlationId },
      };
    }

    // POST /topics
    if (path === '/topics' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const { subjectId, name, slug } = body || {};
      if (!subjectId || !name) {
        return { status: 400, data: { success: false, error: 'subjectId and name are required', correlationId } };
      }
      const topicSlug = slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      try {
        const created = await prisma!.topic.create({
          data: { subjectId, name: name.trim(), slug: topicSlug },
          include: { subject: true },
        });
        return {
          status: 201,
          data: { success: true, persistedToDatabase: true, data: created, correlationId },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'topic.create', correlationId);
      }
    }

    // -------------------------------------------------------------
    // QUIZZES
    // -------------------------------------------------------------

    // GET /quizzes
    if (path === '/quizzes' && method === 'GET') {
      if (prisma) {
        try {
          const quizzes = await prisma.quiz.findMany({
            include: {
              exam: {
                include: { category: true },
              },
              _count: {
                select: { questions: true, attempts: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          const mapped = quizzes.map((q: any) => ({
            id: q.id,
            examId: q.examId,
            examName: q.exam?.name || 'General Exam',
            categoryName: q.exam?.category?.name || 'General',
            title: q.title,
            slug: q.slug,
            description: q.description,
            status: q.status,
            price: q.price,
            currency: q.currency,
            durationSeconds: q.durationSeconds,
            passPercentage: q.passPercentage,
            negativeMark: q.negativeMark,
            totalQuestions: q._count?.questions || 0,
            attemptsCount: q._count?.attempts || 0,
            createdAt: q.createdAt,
            publishedAt: q.publishedAt,
          }));
          return {
            status: 200,
            data: {
              success: true,
              source: 'mysql',
              count: mapped.length,
              data: mapped,
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /quizzes query failed:', dbErr);
          return {
            status: 500,
            data: {
              success: false,
              error: `Failed to fetch quizzes from Hostinger MySQL: ${dbErr?.message}`,
              code: dbErr?.code || 'DB_READ_ERROR',
              correlationId,
            },
          };
        }
      }

      const list = Array.from(quizDb.quizzes.values()).map((q) => {
        const exam = quizDb.exams.get(q.examId);
        const count = Array.from(quizDb.quizQuestions.values()).filter((qq) => qq.quizId === q.id).length;
        return { ...q, examName: exam?.name || 'Exam', totalQuestions: count };
      });
      return {
        status: 200,
        data: {
          success: true,
          source: 'in-memory-fallback',
          count: list.length,
          data: list,
          correlationId,
        },
      };
    }

    // POST /quizzes (STRICT WRITE)
    if (path === '/quizzes' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const {
        examId,
        title,
        slug,
        description,
        status = 'DRAFT',
        price = 0,
        currency = 'BDT',
        durationSeconds = 7200,
        passPercentage = 50.0,
        negativeMark = 0.5,
      } = body || {};

      if (!examId || !title) {
        return {
          status: 400,
          data: { success: false, error: 'examId and title are required', correlationId },
        };
      }

      const quizSlug =
        (slug && typeof slug === 'string' && slug.trim()) ||
        title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      try {
        const created = await prisma!.quiz.create({
          data: {
            examId,
            title: title.trim(),
            slug: quizSlug,
            description: description || null,
            status: status as any,
            price: Number(price) || 0,
            currency: String(currency || 'BDT').toUpperCase(),
            durationSeconds: durationSeconds ? Number(durationSeconds) : null,
            passPercentage: passPercentage ? Number(passPercentage) : null,
            negativeMark: Number(negativeMark) || 0,
            publishedAt: status === 'PUBLISHED' ? new Date() : null,
          },
          include: {
            exam: true,
          },
        });

        quizDb.quizzes.set(created.id, {
          id: created.id,
          examId: created.examId,
          title: created.title,
          slug: created.slug,
          description: created.description,
          status: created.status as any,
          price: created.price,
          currency: created.currency,
          durationSeconds: created.durationSeconds,
          passPercentage: created.passPercentage,
          shuffleQuestions: created.shuffleQuestions,
          shuffleOptions: created.shuffleOptions,
          negativeMark: created.negativeMark,
          maxAttempts: created.maxAttempts,
          publishedAt: created.publishedAt,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        });

        return {
          status: 201,
          data: {
            success: true,
            persistedToDatabase: true,
            database: 'u427015050_quiz',
            data: created,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'quiz.create', correlationId);
      }
    }

    // GET /quizzes/:quizId
    const matchQuiz = path.match(/^\/quizzes\/([^/]+)$/);
    if (matchQuiz && method === 'GET') {
      const quizId = matchQuiz[1];

      if (prisma) {
        try {
          const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
              exam: { include: { category: true } },
              questions: {
                include: {
                  question: {
                    include: {
                      options: {
                        orderBy: { position: 'asc' },
                      },
                    },
                  },
                },
                orderBy: { position: 'asc' },
              },
            },
          });

          if (!quiz) {
            return {
              status: 404,
              data: { success: false, error: 'Quiz not found in database', correlationId },
            };
          }

          const questions = quiz.questions.map((qq: any) => {
            const q = qq.question;
            const options = q.options.map((o: any) => ({
              id: o.id,
              text: o.text,
              imageUrl: o.imageUrl,
              position: o.position,
              // Never leak isCorrect to candidate learners
              isCorrect: userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? o.isCorrect : undefined,
            }));
            return {
              id: q.id,
              position: qq.position,
              body: q.body,
              marks: qq.marks || q.marks,
              options,
            };
          });

          return {
            status: 200,
            data: {
              success: true,
              source: 'mysql',
              data: { ...quiz, questions },
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error(`[Prisma Error] GET /quizzes/${quizId} failed:`, dbErr);
          return {
            status: 500,
            data: { success: false, error: dbErr?.message, correlationId },
          };
        }
      }

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

      return { status: 200, data: { success: true, source: 'in-memory-fallback', data: { ...quiz, questions }, correlationId } };
    }

    // DELETE /quizzes/:quizId
    if (matchQuiz && method === 'DELETE') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const quizId = matchQuiz[1];
      try {
        await prisma!.quiz.delete({
          where: { id: quizId },
        });
        quizDb.quizzes.delete(quizId);
        return {
          status: 200,
          data: { success: true, deletedId: quizId, correlationId },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, `quiz.delete(${quizId})`, correlationId);
      }
    }

    // -------------------------------------------------------------
    // QUESTIONS
    // -------------------------------------------------------------

    // GET /questions
    if (path === '/questions' && method === 'GET') {
      if (prisma) {
        try {
          const questions = await prisma.question.findMany({
            include: {
              subject: true,
              topic: true,
              options: {
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          return {
            status: 200,
            data: {
              success: true,
              source: 'mysql',
              count: questions.length,
              data: questions,
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] GET /questions failed:', dbErr);
          return {
            status: 500,
            data: { success: false, error: dbErr?.message, correlationId },
          };
        }
      }
      return {
        status: 200,
        data: {
          success: true,
          source: 'in-memory-fallback',
          count: quizDb.questions.size,
          data: Array.from(quizDb.questions.values()),
          correlationId,
        },
      };
    }

    // POST /questions (STRICT WRITE: atomic question + options)
    if (path === '/questions' && method === 'POST') {
      const dbUnavailable = requirePrisma();
      if (dbUnavailable) return dbUnavailable;

      const {
        subjectId,
        topicId,
        body: questionBody,
        explanation,
        difficulty = 1,
        marks = 1.0,
        options = [],
      } = body || {};

      if (!subjectId || !questionBody) {
        return {
          status: 400,
          data: { success: false, error: 'subjectId and question body are required', correlationId },
        };
      }

      try {
        const created = await prisma!.question.create({
          data: {
            subjectId,
            topicId: topicId || null,
            body: questionBody,
            explanation: explanation || null,
            difficulty: Number(difficulty) || 1,
            marks: Number(marks) || 1.0,
            options: {
              create: (options || []).map((opt: any, index: number) => ({
                text: opt.text || '',
                isCorrect: !!opt.isCorrect,
                position: opt.position || index + 1,
                imageUrl: opt.imageUrl || null,
              })),
            },
          },
          include: {
            options: true,
            subject: true,
            topic: true,
          },
        });

        return {
          status: 201,
          data: {
            success: true,
            persistedToDatabase: true,
            database: 'u427015050_quiz',
            data: created,
            correlationId,
          },
        };
      } catch (dbErr: any) {
        return handlePrismaWriteError(dbErr, 'question.create', correlationId);
      }
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

    // Inter-Service Internal Query: Fetch questions with correct answers for authoritative scoring
    if (path === '/internal/quiz-scoring-keys' && method === 'POST') {
      const targetQuizId = body?.quizId;
      if (!targetQuizId) {
        return { status: 400, data: { success: false, error: 'quizId is required', correlationId } };
      }

      if (prisma) {
        try {
          const quiz = await prisma.quiz.findUnique({
            where: { id: targetQuizId },
            include: {
              questions: {
                include: {
                  question: {
                    include: { options: true },
                  },
                },
              },
            },
          });

          if (!quiz) {
            return { status: 404, data: { success: false, error: 'Quiz not found', correlationId } };
          }

          const keys = quiz.questions.map((qq: any) => {
            const correctOpt = qq.question.options.find((o: any) => o.isCorrect);
            return {
              questionId: qq.questionId,
              marks: qq.marks || qq.question.marks || 1.0,
              correctOptionId: correctOpt?.id || null,
            };
          });

          return {
            status: 200,
            data: {
              success: true,
              quiz: {
                id: quiz.id,
                negativeMark: quiz.negativeMark,
                passPercentage: quiz.passPercentage,
                price: quiz.price,
              },
              keys,
              correlationId,
            },
          };
        } catch (dbErr: any) {
          console.error('[Prisma Error] Internal scoring keys failed:', dbErr);
          return {
            status: 500,
            data: { success: false, error: dbErr?.message, correlationId },
          };
        }
      }

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

/**
 * Cloudflare Worker Entry Point (Wrangler dev / production)
 * - Immediate CORS preflight (OPTIONS) response (HTTP 204)
 * - Normalizes /api/v1/* and /api/* route prefixes
 * - Initialized PrismaClient singleton with Hostinger MySQL / Hyperdrive bindings
 * - Guarantees full error diagnostic payload on failure (no faked 201 successes)
 */
export interface WorkerEnv {
  DATABASE_URL?: string;
  QUIZ_DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  CORS_ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: WorkerEnv = {}): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const rawOrigins = env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
    const allowedOrigins = typeof rawOrigins === 'string'
      ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
      : [rawOrigins];

    let matchedOrigin: string | null = null;
    if (origin && allowedOrigins.includes(origin)) {
      matchedOrigin = origin;
    } else if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      matchedOrigin = origin;
    } else if (!origin) {
      matchedOrigin = allowedOrigins[0] || 'http://localhost:3000';
    } else {
      matchedOrigin = allowedOrigins[0] || null;
    }

    const corsHeaders: Record<string, string> = {
      ...(matchedOrigin ? { 'Access-Control-Allow-Origin': matchedOrigin } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Correlation-ID, X-User-Role, X-Idempotency-Key',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };

    // 1. Immediately handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    let path = url.pathname;

    // 2. Normalize route paths by stripping API prefixes (/api/v1 or /api)
    if (path.startsWith('/api/v1')) {
      path = path.slice('/api/v1'.length);
    } else if (path.startsWith('/api')) {
      path = path.slice('/api'.length);
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // 3. Parse JSON request body if present
    let body: any = null;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('[Request Parser] Non-JSON payload received:', parseErr);
        body = null;
      }
    }

    const correlationId =
      request.headers.get('X-Correlation-ID') ||
      request.headers.get('X-Request-ID') ||
      crypto.randomUUID();
    const userRole = request.headers.get('X-User-Role') || undefined;

    // 4. Safely resolve Prisma Client without crashing Edge runtime
    let prisma: PrismaClient | undefined = undefined;
    const dbUrl = resolveDatabaseUrl(env);
    if (dbUrl) {
      try {
        prisma = getPrismaClient(dbUrl);
      } catch (initErr) {
        console.error('[Worker Gateway] Failed to instantiate PrismaClient:', initErr);
      }
    }

    // 5. Delegate to quizService handler
    try {
      const result = await quizService.handle({
        path,
        method: request.method,
        body,
        query: url.searchParams,
        correlationId,
        userRole,
        prisma,
      });

      return new Response(JSON.stringify(result.data), {
        status: result.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Correlation-ID': correlationId,
          ...corsHeaders,
        },
      });
    } catch (unhandledErr: any) {
      console.error('[Worker Fatal Error] Unhandled exception in quizService:', unhandledErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: unhandledErr?.message || 'Fatal internal service error',
          code: 'UNHANDLED_EXCEPTION',
          stack: env.ENVIRONMENT !== 'production' ? unhandledErr?.stack : undefined,
          correlationId,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Correlation-ID': correlationId,
            ...corsHeaders,
          },
        }
      );
    }
  },
};
