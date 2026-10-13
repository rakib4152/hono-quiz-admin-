import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { 
  createDrizzleClient, 
  categories, 
  exams, 
  quizzes 
} from '@repo/database'
import { eq, desc } from 'drizzle-orm'

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

export default app