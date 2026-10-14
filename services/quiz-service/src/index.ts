import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { 
  createDrizzleClient, 
  categories, 
  exams, 
  quizzes,
  questions,
  options
} from '@repo/database'
import { eq, desc, and } from 'drizzle-orm'

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
 * GET /categories
 * Returns all categories with their associated exams using standard SQL joins
 */
app.get('/categories', async (c) => {
  try {
    const db = createDrizzleClient(c.env)

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(desc(categories.createdAt))

    const allExams = await db
      .select()
      .from(exams)

    const data = allCategories.map((category) => ({
      ...category,
      exams: allExams.filter((exam) => exam.categoryId === category.id),
    }))

    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /categories query failed:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch categories' 
    }, 500)
  }
})

/**
 * GET /exams
 */
app.get('/exams', async (c) => {
  try {
    const db = createDrizzleClient(c.env)
    const data = await db
      .select()
      .from(exams)
      .orderBy(desc(exams.createdAt))

    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /exams query failed:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch exams' 
    }, 500)
  }
})

/**
 * GET /quizzes
 */
app.get('/quizzes', async (c) => {
  try {
    const db = createDrizzleClient(c.env)
    const data = await db
      .select()
      .from(quizzes)
      .orderBy(desc(quizzes.createdAt))

    return c.json({ success: true, data }, 200)
  } catch (error: any) {
    console.error('[Drizzle Error] GET /quizzes query failed:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch quizzes' 
    }, 500)
  }
})

/**
 * POST /internal/quiz-scoring-keys
 * Internal endpoint for attempt-service to fetch quiz metadata and answer keys
 */
app.post('/internal/quiz-scoring-keys', async (c) => {
  try {
    const { quizId } = await c.req.json()
    const db = createDrizzleClient(c.env)

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1)

    if (!quiz.length) {
      return c.json({ success: false, error: 'Quiz not found' }, 404)
    }

    const quizQuestions = await db
      .select({
        questionId: questions.id,
        marks: questions.marks,
        correctOptionId: options.id,
      })
      .from(questions)
      .innerJoin(options, and(eq(options.questionId, questions.id), eq(options.isCorrect, true)))
      .where(eq(questions.id, questions.id)) // This needs fixing - should join through a quiz_questions table
      
    // Since we don't have quiz_questions table in the schema, fetch all questions for this quiz's exams
    // For now, return simplified structure
    return c.json({
      success: true,
      quiz: quiz[0],
      keys: quizQuestions,
    })
  } catch (error: any) {
    console.error('[Drizzle Error] POST /internal/quiz-scoring-keys failed:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch quiz keys' 
    }, 500)
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