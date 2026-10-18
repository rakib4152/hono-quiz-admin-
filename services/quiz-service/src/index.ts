import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { 
   categories, 
   exams, 
   quizzes,
   questions,
   options,
   quizQuestions
 } from '@packages/database'
import { eq, desc, and } from 'drizzle-orm'
import { createDrizzleClient, type DrizzleDB, endDrizzleConnection } from '@packages/database'

type Bindings = {
  HYPERDRIVE?: { connectionString: string }
  DATABASE_URL?: string
  CORS_ALLOWED_ORIGINS?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ALLOWED_ORIGINS ? c.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
  return corsMiddleware(c, next)
})

/**
 * Helper to create Drizzle client from env
 */
async function createDrizzleFromEnv(env: Bindings): Promise<DrizzleDB> {
  return createDrizzleClient(env)
}

/**
 * GET /categories
 * Returns all categories with their associated exams using standard SQL joins
 */
app.get('/categories', async (c) => {
  const db = await createDrizzleFromEnv(c.env)
  try {
    const allCategories = await db.select().from(categories).orderBy(desc(categories.createdAt))
    const allExams = await db.select().from(exams)
    const data = allCategories.map((category) => ({
      ...category,
      exams: allExams.filter((exam) => exam.categoryId === category.id),
    }))
    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /categories query failed:', error)
    console.error('[Drizzle Error] GET /categories cause:', error?.cause)
    console.error('[Drizzle Error] GET /categories cause.code:', error?.cause?.code)
    console.error('[Drizzle Error] GET /categories cause.errno:', error?.cause?.errno)
    console.error('[Drizzle Error] GET /categories cause.sqlMessage:', error?.cause?.sqlMessage)
    console.error('[Drizzle Error] GET /categories cause.message:', error?.cause?.message)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch categories' 
    }, 500)
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db))
  }
})

/**
 * GET /exams
 */
app.get('/exams', async (c) => {
  const db = await createDrizzleFromEnv(c.env)
  try {
    const data = await db.select().from(exams).orderBy(desc(exams.createdAt))
    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /exams query failed:', error)
    console.error('[Drizzle Error] GET /exams cause:', error?.cause)
    console.error('[Drizzle Error] GET /exams cause.code:', error?.cause?.code)
    console.error('[Drizzle Error] GET /exams cause.errno:', error?.cause?.errno)
    console.error('[Drizzle Error] GET /exams cause.sqlMessage:', error?.cause?.sqlMessage)
    console.error('[Drizzle Error] GET /exams cause.message:', error?.cause?.message)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch exams' 
    }, 500)
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db))
  }
})

/**
 * GET /quizzes
 */
app.get('/quizzes', async (c) => {
  const db = await createDrizzleFromEnv(c.env)
  try {
    const data = await db.select().from(quizzes).orderBy(desc(quizzes.createdAt))
    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /quizzes query failed:', error)
    console.error('[Drizzle Error] GET /quizzes cause:', error?.cause)
    console.error('[Drizzle Error] GET /quizzes cause.code:', error?.cause?.code)
    console.error('[Drizzle Error] GET /quizzes cause.errno:', error?.cause?.errno)
    console.error('[Drizzle Error] GET /quizzes cause.sqlMessage:', error?.cause?.sqlMessage)
    console.error('[Drizzle Error] GET /quizzes cause.message:', error?.cause?.message)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch quizzes' 
    }, 500)
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db))
  }
})

/**
 * POST /internal/quiz-scoring-keys
 * Internal endpoint for attempt-service to fetch quiz metadata and answer keys
 */
app.post('/internal/quiz-scoring-keys', async (c) => {
  const db = await createDrizzleFromEnv(c.env)
  try {
    const { quizId } = await c.req.json()

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId))
    if (!quizResult.length) {
      return c.json({ success: false, error: 'Quiz not found' }, 404)
    }
    const quiz = quizResult[0]

    const keys = await db
      .select({
        questionId: questions.id,
        marks: questions.marks,
        correctOptionId: options.id,
      })
      .from(questions)
      .innerJoin(options, and(eq(options.questionId, questions.id), eq(options.isCorrect, true)))
      .innerJoin(quizQuestions, and(eq(quizQuestions.questionId, questions.id), eq(quizQuestions.quizId, quizId)))
    
    return c.json({
      success: true,
      quiz,
      keys,
    })
  } catch (error: any) {
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys failed:', error)
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys cause:', error?.cause)
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys cause.code:', error?.cause?.code)
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys cause.errno:', error?.cause?.errno)
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys cause.sqlMessage:', error?.cause?.sqlMessage)
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys cause.message:', error?.cause?.message)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch quiz keys' 
    }, 500)
  } finally {
    c.executionCtx.waitUntil(endDrizzleConnection(db))
  }
})

/**
 * Helper to create a mock request context for internal handle() calls
 */
function createMockContext(req: { path: string; method: string; body?: any; correlationId: string }, env: Bindings) {
  return {
    req: {
      path: req.path,
      method: req.method,
      json: async () => req.body || {},
      header: () => undefined,
      raw: new Request('http://internal', {
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
  } as any
}

/**
 * quizService object with handle() method for inter-service calls
 * Matches the interface expected by attempt-service and other services
 */
export const quizService = {
  async handle(req: { path: string; method: string; body?: any; correlationId: string; env?: Bindings }) {
    const env = req.env || {} as Bindings
    const mockContext = createMockContext(req, env)
    const response = await app.fetch(mockContext.req.raw, env, {})
    const data = await response.json()
    return { status: response.status, data }
  },
}

export default app
