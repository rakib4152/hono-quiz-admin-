import { Hono } from 'hono';
import {
  categories,
  exams,
  subjects,
  topics,
  quizzes,
  questions,
  options,
  quizQuestions,
  createDrizzleClient,
  type DrizzleDB,
  endDrizzleConnection,
} from '../../../packages/database/src/index.js';
import { eq, desc, asc, and, inArray, sql } from 'drizzle-orm';

type Bindings = {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  CORS_ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * Helper to create Drizzle client from env
 */
async function createDrizzleFromEnv(env: Bindings): Promise<DrizzleDB> {
  return createDrizzleClient(env);
}

async function cleanupDbConnection(db: DrizzleDB, c: any): Promise<void> {
  const cleanup = endDrizzleConnection(db).catch((err) => {
    console.error('[Drizzle Cleanup Error]:', err);
  });
  let ctx: { waitUntil?: (p: Promise<any>) => void } | undefined;
  try {
    ctx = c.executionCtx;
  } catch {
    ctx = undefined;
  }
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(cleanup);
  } else {
    await cleanup;
  }
}

/**
 * Requires ADMIN or SUPER_ADMIN role for mutating endpoints
 */
function requireAdmin(c: any): { allowed: boolean; userRole?: string } | Response {
  const userRole = c.req.header('X-User-Role') || '';
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return c.json({ success: false, error: 'Admin access required' }, 403);
  }
  return { allowed: true, userRole };
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.slice(0, 30);
}

// ============================================================================
// 1. SYSTEM & DATABASE DIAGNOSTICS
// ============================================================================

/**
 * GET /db-health
 * Diagnostic ping to verify Hostinger MySQL connectivity
 */
app.get('/db-health', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  const start = Date.now();
  try {
    await db.execute('SELECT 1');
    return c.json({
      connected: true,
      latencyMs: Date.now() - start,
      database: 'u427015050_drizzle',
      target: 'Hostinger Remote MySQL 8.0 via Drizzle ORM',
    }, 200);
  } catch (error: any) {
    return c.json({
      connected: false,
      latencyMs: Date.now() - start,
      error: error?.message || 'Database ping failed',
    }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 2. CATEGORIES ENDPOINTS
// ============================================================================

/**
 * GET /categories
 * List all categories with associated exams count
 */
app.get('/categories', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const allCategories = await db.select().from(categories).orderBy(desc(categories.createdAt));
    const allExams = await db.select().from(exams);
    const data = allCategories.map((category) => ({
      ...category,
      exams: allExams.filter((exam) => exam.categoryId === category.id),
      _count: {
        exams: allExams.filter((exam) => exam.categoryId === category.id).length,
      },
    }));
    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    console.error('[Drizzle Error] GET /categories query failed:', error);
    return c.json({ success: false, error: error.message || 'Failed to fetch categories' }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * GET /categories/:id
 * Get single category by ID
 */
app.get('/categories/:id', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  const categoryId = c.req.param('id');
  try {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404);
    }
    const catExams = await db.select().from(exams).where(eq(exams.categoryId, categoryId));
    return c.json({ success: true, data: { ...category, exams: catExams } }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /categories
 * Create a new category in Hostinger MySQL
 */
app.post('/categories', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, slug } = body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return c.json({ success: false, error: 'Category name is required' }, 400);
    }

    const categorySlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newId = body.id || generateId('cat');

    await db.insert(categories).values({
      id: newId,
      name: name.trim(),
      slug: categorySlug,
    });

    const [created] = await db.select().from(categories).where(eq(categories.id, newId)).limit(1);
    return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
  } catch (error: any) {
    console.error('[Drizzle Error] POST /categories failed:', error);
    const isDuplicate = error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;
    return c.json({ success: false, error: isDuplicate ? 'Category slug already exists' : error.message }, isDuplicate ? 409 : 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * PUT /categories/:id
 * Update an existing category
 */
app.put('/categories/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const categoryId = c.req.param('id');
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, slug } = body || {};

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (slug) updateData.slug = slug.trim();

    await db.update(categories).set(updateData).where(eq(categories.id, categoryId));
    const [updated] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    return c.json({ success: true, data: updated }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * DELETE /categories/:id
 * Delete a category by ID
 */
app.delete('/categories/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const categoryId = c.req.param('id');
  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
    return c.json({ success: true, deletedId: categoryId }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 3. EXAMS ENDPOINTS
// ============================================================================

/**
 * GET /exams
 * List all exams with parent category information
 */
app.get('/exams', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const allExams = await db.select().from(exams).orderBy(asc(exams.name));
    const allCategories = await db.select().from(categories);
    const catMap = new Map(allCategories.map((c) => [c.id, c.name]));

    const data = allExams.map((e) => ({
      ...e,
      categoryName: catMap.get(e.categoryId) || 'General',
    }));
    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    console.error('[Drizzle Error] GET /exams query failed:', error);
    return c.json({ success: false, error: error.message || 'Failed to fetch exams' }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * GET /exams/:id
 * Get single exam with quizzes
 */
app.get('/exams/:id', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  const examId = c.req.param('id');
  try {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) {
      return c.json({ success: false, error: 'Exam not found' }, 404);
    }
    const examQuizzes = await db.select().from(quizzes).where(eq(quizzes.examId, examId));
    return c.json({ success: true, data: { ...exam, quizzes: examQuizzes } }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /exams
 * Create a new exam
 */
app.post('/exams', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const { categoryId, name, slug, description } = body || {};
    if (!categoryId || !name) {
      return c.json({ success: false, error: 'categoryId and name are required' }, 400);
    }

    const examSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newId = body.id || generateId('exam');

    await db.insert(exams).values({
      id: newId,
      categoryId,
      name: name.trim(),
      slug: examSlug,
      description: description || null,
    });

    const [created] = await db.select().from(exams).where(eq(exams.id, newId)).limit(1);
    return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
  } catch (error: any) {
    console.error('[Drizzle Error] POST /exams failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * DELETE /exams/:id
 * Delete an exam
 */
app.delete('/exams/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const examId = c.req.param('id');
  try {
    await db.delete(exams).where(eq(exams.id, examId));
    return c.json({ success: true, deletedId: examId }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 4. SUBJECTS & TOPICS ENDPOINTS
// ============================================================================

/**
 * GET /subjects
 * List all subjects
 */
app.get('/subjects', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const data = await db.select().from(subjects).orderBy(asc(subjects.name));
    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /subjects
 * Create a new subject
 */
app.post('/subjects', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, slug } = body || {};
    if (!name) return c.json({ success: false, error: 'Subject name is required' }, 400);

    const subSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const newId = body.id || generateId('sub');

    await db.insert(subjects).values({ id: newId, name: name.trim(), slug: subSlug });
    const [created] = await db.select().from(subjects).where(eq(subjects.id, newId)).limit(1);
    return c.json({ success: true, data: created }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * GET /topics
 * List all topics with associated subject
 */
app.get('/topics', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const allTopics = await db.select().from(topics).orderBy(asc(topics.name));
    const allSubjects = await db.select().from(subjects);
    const subMap = new Map(allSubjects.map((s) => [s.id, s.name]));

    const data = allTopics.map((t) => ({
      ...t,
      subjectName: subMap.get(t.subjectId) || null,
    }));
    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /topics
 * Create a new topic under a subject
 */
app.post('/topics', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const { subjectId, name, slug } = body || {};
    if (!subjectId || !name) return c.json({ success: false, error: 'subjectId and name are required' }, 400);

    const topicSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const newId = body.id || generateId('top');

    await db.insert(topics).values({ id: newId, subjectId, name: name.trim(), slug: topicSlug });
    const [created] = await db.select().from(topics).where(eq(topics.id, newId)).limit(1);
    return c.json({ success: true, data: created }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 5. QUIZZES ENDPOINTS
// ============================================================================

/**
 * GET /quizzes
 * List all quizzes with exam details & questions count
 */
app.get('/quizzes', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const allQuizzes = await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
    const allExams = await db.select().from(exams);
    const allQuizQuestions = await db.select().from(quizQuestions);

    const examMap = new Map(allExams.map((e) => [e.id, e]));

    const data = allQuizzes.map((q) => {
      const exam = examMap.get(q.examId);
      const qCount = allQuizQuestions.filter((qq) => qq.quizId === q.id).length;
      return {
        ...q,
        examName: exam?.name || 'General Exam',
        totalQuestions: qCount,
      };
    });
    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    console.error('[Drizzle Error] GET /quizzes query failed:', error);
    return c.json({ success: false, error: error.message || 'Failed to fetch quizzes' }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * GET /quizzes/:id
 * Get full quiz details including questions and options
 */
app.get('/quizzes/:id', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  const quizId = c.req.param('id');
  const userRole = c.req.header('X-User-Role') || '';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  try {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    if (!quiz) {
      return c.json({ success: false, error: 'Quiz not found' }, 404);
    }

    const assigned = await db
      .select({
        quizId: quizQuestions.quizId,
        questionId: quizQuestions.questionId,
        position: quizQuestions.position,
        marks: quizQuestions.marks,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position));

    const questionIds = assigned.map((a) => a.questionId);
    let questionsList: any[] = [];

    if (questionIds.length > 0) {
      const dbQuestions = await db.select().from(questions).where(inArray(questions.id, questionIds));
      const dbOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));

      const qMap = new Map(dbQuestions.map((q) => [q.id, q]));
      const optMap = new Map<string, any[]>();
      for (const opt of dbOptions) {
        if (!optMap.has(opt.questionId)) optMap.set(opt.questionId, []);
        optMap.get(opt.questionId)!.push({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl,
          position: opt.position,
          isCorrect: isAdmin ? opt.isCorrect : undefined,
        });
      }

      questionsList = assigned.map((a) => {
        const q = qMap.get(a.questionId);
        if (!q) return null;
        return {
          id: q.id,
          position: a.position,
          body: q.body,
          marks: a.marks || q.marks,
          options: (optMap.get(q.id) || []).sort((x, y) => x.position - y.position),
        };
      }).filter(Boolean);
    }

    return c.json({ success: true, data: { ...quiz, questions: questionsList } }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /quizzes
 * Create a new quiz
 */
app.post('/quizzes', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const {
      examId,
      categoryId,
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
      return c.json({ success: false, error: 'examId and title are required' }, 400);
    }

    const quizSlug = slug?.trim() || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newId = body.id || generateId('quiz');

    await db.insert(quizzes).values({
      id: newId,
      examId,
      categoryId: categoryId || null,
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
    });

    const [created] = await db.select().from(quizzes).where(eq(quizzes.id, newId)).limit(1);
    return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
  } catch (error: any) {
    console.error('[Drizzle Error] POST /quizzes failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * PUT /quizzes/:id
 * Update quiz metadata or publish status
 */
app.put('/quizzes/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const quizId = c.req.param('id');
  try {
    const body = await c.req.json().catch(() => ({}));
    const updateData: any = {};
    if (body.title) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'PUBLISHED') updateData.publishedAt = new Date();
    }
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.durationSeconds !== undefined) updateData.durationSeconds = Number(body.durationSeconds);
    if (body.passPercentage !== undefined) updateData.passPercentage = Number(body.passPercentage);
    if (body.negativeMark !== undefined) updateData.negativeMark = Number(body.negativeMark);

    await db.update(quizzes).set(updateData).where(eq(quizzes.id, quizId));
    const [updated] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    return c.json({ success: true, data: updated }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * DELETE /quizzes/:id
 * Delete quiz and question links
 */
app.delete('/quizzes/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const quizId = c.req.param('id');
  try {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
    return c.json({ success: true, deletedId: quizId }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /quizzes/:id/questions
 * Link questions to a quiz
 */
app.post('/quizzes/:id/questions', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const quizId = c.req.param('id');
  try {
    const body = await c.req.json().catch(() => ({}));
    const { questionId, position = 1, marks = 1.0 } = body || {};

    if (!questionId) return c.json({ success: false, error: 'questionId is required' }, 400);

    await db.insert(quizQuestions).values({
      quizId,
      questionId,
      position: Number(position) || 1,
      marks: Number(marks) || 1.0,
    });

    return c.json({ success: true, linked: { quizId, questionId, position, marks } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * GET /quizzes/:id/offline-package
 * Offline content bundle without answers
 */
app.get('/quizzes/:id/offline-package', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  const quizId = c.req.param('id');
  try {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    if (!quiz) return c.json({ success: false, error: 'Quiz not found' }, 404);

    const assigned = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    const questionIds = assigned.map((a) => a.questionId);

    let questionsList: any[] = [];
    if (questionIds.length > 0) {
      const dbQuestions = await db.select().from(questions).where(inArray(questions.id, questionIds));
      const dbOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));

      const qMap = new Map(dbQuestions.map((q) => [q.id, q]));
      questionsList = assigned.map((a) => {
        const q = qMap.get(a.questionId);
        if (!q) return null;
        const opts = dbOptions
          .filter((o) => o.questionId === q.id)
          .sort((x, y) => x.position - y.position)
          .map((o) => ({ id: o.id, text: o.text, position: o.position })); // Answers strictly excluded
        return { id: q.id, position: a.position, body: q.body, marks: a.marks || q.marks, options: opts };
      }).filter(Boolean);
    }

    return c.json({
      success: true,
      offlinePackage: {
        packageVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        quiz: { id: quiz.id, title: quiz.title, durationSeconds: quiz.durationSeconds, negativeMark: quiz.negativeMark },
        questions: questionsList,
      },
    }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 6. QUESTIONS & OPTIONS ENDPOINTS
// ============================================================================

/**
 * GET /questions
 * List all questions with options
 */
app.get('/questions', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const allQuestions = await db.select().from(questions).orderBy(desc(questions.createdAt));
    const allOptions = await db.select().from(options);

    const optMap = new Map<string, any[]>();
    for (const opt of allOptions) {
      if (!optMap.has(opt.questionId)) optMap.set(opt.questionId, []);
      optMap.get(opt.questionId)!.push(opt);
    }

    const data = allQuestions.map((q) => ({
      ...q,
      options: (optMap.get(q.id) || []).sort((a, b) => a.position - b.position),
    }));

    return c.json({ success: true, count: data.length, data }, 200);
  } catch (error: any) {
    console.error('[Drizzle Error] GET /questions failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * POST /questions
 * Create atomic question and options
 */
app.post('/questions', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  try {
    const body = await c.req.json().catch(() => ({}));
    const {
      subjectId,
      topicId,
      body: questionBody,
      explanation,
      difficulty = 1,
      marks = 1.0,
      options: rawOptions = [],
    } = body || {};

    if (!subjectId || !questionBody) {
      return c.json({ success: false, error: 'subjectId and question body are required' }, 400);
    }

    const newQuestionId = body.id || generateId('q');

    // Transaction: insert question and options atomically
    const result = await db.transaction(async (tx) => {
      await tx.insert(questions).values({
        id: newQuestionId,
        subjectId,
        topicId: topicId || null,
        body: questionBody,
        explanation: explanation || null,
        difficulty: Number(difficulty) || 1,
        marks: Number(marks) || 1.0,
      });

      const insertedOptions: any[] = [];
      if (Array.isArray(rawOptions) && rawOptions.length > 0) {
        for (let i = 0; i < rawOptions.length; i++) {
          const opt = rawOptions[i];
          const optId = opt.id || generateId('opt');
          const optValues = {
            id: optId,
            questionId: newQuestionId,
            text: opt.text || '',
            isCorrect: !!opt.isCorrect,
            position: opt.position || i + 1,
            imageUrl: opt.imageUrl || null,
          };
          await tx.insert(options).values(optValues);
          insertedOptions.push(optValues);
        }
      }

      const [created] = await tx.select().from(questions).where(eq(questions.id, newQuestionId)).limit(1);
      return { created, insertedOptions };
    });

    return c.json({
      success: true,
      persistedToDatabase: true,
      data: {
        ...result.created,
        options: result.insertedOptions,
      },
    }, 201);
  } catch (error: any) {
    console.error('[Drizzle Error] POST /questions failed:', error);
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

/**
 * DELETE /questions/:id
 * Delete a question and its options
 */
app.delete('/questions/:id', async (c) => {
  const admin = requireAdmin(c);
  if (admin instanceof Response) return admin;
  const db = await createDrizzleFromEnv(c.env);
  const questionId = c.req.param('id');
  try {
    await db.delete(options).where(eq(options.questionId, questionId));
    await db.delete(quizQuestions).where(eq(quizQuestions.questionId, questionId));
    await db.delete(questions).where(eq(questions.id, questionId));
    return c.json({ success: true, deletedId: questionId }, 200);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 7. INTERNAL SCORING KEYS
// ============================================================================

/**
 * POST /internal/quiz-scoring-keys
 * Internal endpoint for attempt-service to fetch quiz metadata and answer keys
 */
app.post('/internal/quiz-scoring-keys', async (c) => {
  const db = await createDrizzleFromEnv(c.env);
  try {
    const { quizId } = await c.req.json().catch(() => ({}));
    if (!quizId) {
      return c.json({ success: false, error: 'quizId is required' }, 400);
    }

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quizResult.length) {
      return c.json({ success: false, error: 'Quiz not found' }, 404);
    }
    const quiz = quizResult[0];

    const keys = await db
      .select({
        questionId: questions.id,
        marks: questions.marks,
        correctOptionId: options.id,
      })
      .from(questions)
      .innerJoin(options, and(eq(options.questionId, questions.id), eq(options.isCorrect, true)))
      .innerJoin(quizQuestions, and(eq(quizQuestions.questionId, questions.id), eq(quizQuestions.quizId, quizId)));

    return c.json({
      success: true,
      quiz,
      keys,
    }, 200);
  } catch (error: any) {
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys failed:', error);
    return c.json({ success: false, error: error.message || 'Failed to fetch quiz keys' }, 500);
  } finally {
    await cleanupDbConnection(db, c);
  }
});

// ============================================================================
// 8. INTER-SERVICE HANDLER ADAPTER
// ============================================================================

function createMockContext(req: { path: string; method: string; body?: any; correlationId: string }, env: Bindings) {
  return {
    req: {
      path: req.path,
      method: req.method,
      json: async () => req.body || {},
      header: () => undefined,
      raw: new Request(`http://internal${req.path.startsWith('/') ? req.path : '/' + req.path}`, {
        method: req.method,
        body: req.body ? JSON.stringify(req.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': req.correlationId,
        },
      }),
    },
    env,
    json: (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }),
  } as any;
}

export const quizService = {
  async handle(req: { path: string; method: string; body?: any; correlationId: string; env?: Bindings; query?: any; userRole?: string }) {
    const env = req.env || ({} as Bindings);
    const mockContext = createMockContext(req, env);
    const response = await app.fetch(mockContext.req.raw, env, {
      waitUntil: (p: Promise<any>) => { void p; },
      passThroughOnException: () => {},
      props: {},
    } as any);
    const data = await response.json();
    return { status: response.status, data };
  },
};

export const quizApp = app;
export default app;
