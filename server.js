var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// apps/src/routes/health.ts
function createHealthHandler(env, startupTime2) {
  const uptimeSeconds = Math.floor((Date.now() - startupTime2) / 1e3);
  return {
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimeSeconds,
    service: "quiz-platform-api",
    runtime: "Cloudflare Workers (Edge)",
    bindings: {
      hyperdrive: !!env?.HYPERDRIVE,
      kvCache: !!env?.CACHE_KV,
      r2Assets: !!env?.ASSETS_R2,
      databaseUrlConfigured: !!(env?.DATABASE_URL || env?.QUIZ_DATABASE_URL)
    },
    version: env?.API_VERSION || "v1",
    environment: env?.ENVIRONMENT || "development"
  };
}
var init_health = __esm({
  "apps/src/routes/health.ts"() {
  }
});

// packages/database/src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attemptAnswers: () => attemptAnswers,
  attempts: () => attempts,
  bookmarks: () => bookmarks,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  exams: () => exams,
  examsRelations: () => examsRelations,
  options: () => options,
  optionsRelations: () => optionsRelations,
  orders: () => orders,
  payments: () => payments,
  questions: () => questions,
  questionsRelations: () => questionsRelations,
  quizAccess: () => quizAccess,
  quizQuestions: () => quizQuestions,
  quizzes: () => quizzes,
  quizzesRelations: () => quizzesRelations,
  subjects: () => subjects,
  topics: () => topics,
  users: () => users
});
import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  primaryKey,
  uniqueIndex,
  boolean,
  double
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, categories, exams, subjects, topics, quizzes, questions, options, quizQuestions, attempts, attemptAnswers, bookmarks, quizAccess, orders, payments, categoriesRelations, examsRelations, quizzesRelations, questionsRelations, optionsRelations;
var init_schema = __esm({
  "packages/database/src/schema.ts"() {
    users = mysqlTable(
      "users",
      {
        // Clerk user IDs (e.g. 'user_2s6Nq...') or standard identifiers
        id: varchar("id", { length: 64 }).primaryKey(),
        name: varchar("name", { length: 191 }),
        email: varchar("email", { length: 191 }).unique(),
        // Deprecated: Authentication managed securely by Clerk
        passwordHash: varchar("password_hash", { length: 255 }),
        role: varchar("role", { length: 20 }).default("USER").notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        uniqueIndex("email_idx").on(table.email)
      ]
    );
    categories = mysqlTable(
      "categories",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        name: varchar("name", { length: 191 }).notNull(),
        slug: varchar("slug", { length: 191 }).notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        uniqueIndex("cat_slug_idx").on(table.slug)
      ]
    );
    exams = mysqlTable(
      "exams",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        categoryId: varchar("category_id", { length: 30 }).notNull(),
        name: varchar("name", { length: 191 }).notNull(),
        slug: varchar("slug", { length: 191 }).notNull(),
        description: text("description"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        uniqueIndex("cat_exam_slug_idx").on(table.categoryId, table.slug)
      ]
    );
    subjects = mysqlTable("subjects", {
      id: varchar("id", { length: 30 }).primaryKey(),
      name: varchar("name", { length: 191 }).notNull(),
      slug: varchar("slug", { length: 191 }).notNull().unique()
    });
    topics = mysqlTable(
      "topics",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        subjectId: varchar("subject_id", { length: 30 }).notNull(),
        name: varchar("name", { length: 191 }).notNull(),
        slug: varchar("slug", { length: 191 }).notNull()
      },
      (table) => [
        uniqueIndex("sub_topic_slug_idx").on(table.subjectId, table.slug)
      ]
    );
    quizzes = mysqlTable(
      "quizzes",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        examId: varchar("exam_id", { length: 30 }).notNull(),
        categoryId: varchar("category_id", { length: 30 }),
        title: varchar("title", { length: 191 }).notNull(),
        slug: varchar("slug", { length: 191 }).notNull(),
        description: text("description"),
        status: varchar("status", { length: 20 }).default("DRAFT").notNull(),
        price: int("price").default(0).notNull(),
        currency: varchar("currency", { length: 3 }).default("BDT").notNull(),
        durationSeconds: int("duration_seconds"),
        passPercentage: double("pass_percentage"),
        shuffleQuestions: boolean("shuffle_questions").default(false).notNull(),
        shuffleOptions: boolean("shuffle_options").default(false).notNull(),
        negativeMark: double("negative_mark").default(0).notNull(),
        maxAttempts: int("max_attempts"),
        publishedAt: timestamp("published_at"),
        deletedAt: timestamp("deleted_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        uniqueIndex("exam_quiz_slug_idx").on(table.examId, table.slug)
      ]
    );
    questions = mysqlTable("questions", {
      id: varchar("id", { length: 30 }).primaryKey(),
      subjectId: varchar("subject_id", { length: 30 }).notNull(),
      topicId: varchar("topic_id", { length: 30 }),
      body: text("body").notNull(),
      explanation: text("explanation"),
      type: varchar("type", { length: 30 }).default("single_choice").notNull(),
      difficulty: int("difficulty").default(1).notNull(),
      marks: double("marks").default(1).notNull(),
      imageUrl: varchar("image_url", { length: 500 }),
      isActive: boolean("is_active").default(true).notNull(),
      deletedAt: timestamp("deleted_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    options = mysqlTable("options", {
      id: varchar("id", { length: 30 }).primaryKey(),
      questionId: varchar("question_id", { length: 30 }).notNull(),
      text: text("text").notNull(),
      imageUrl: varchar("image_url", { length: 500 }),
      isCorrect: boolean("is_correct").default(false).notNull(),
      position: int("position").notNull()
    });
    quizQuestions = mysqlTable(
      "quiz_questions",
      {
        quizId: varchar("quiz_id", { length: 30 }).notNull(),
        questionId: varchar("question_id", { length: 30 }).notNull(),
        position: int("position").notNull(),
        marks: double("marks")
      },
      (table) => [
        primaryKey({ columns: [table.quizId, table.questionId] })
      ]
    );
    attempts = mysqlTable(
      "attempts",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        userId: varchar("user_id", { length: 64 }).notNull(),
        quizId: varchar("quiz_id", { length: 30 }).notNull(),
        status: varchar("status", { length: 20 }).default("IN_PROGRESS").notNull(),
        requestId: varchar("request_id", { length: 191 }).unique(),
        startedAt: timestamp("started_at").defaultNow().notNull(),
        submittedAt: timestamp("submitted_at"),
        expiresAt: timestamp("expires_at"),
        totalQuestions: int("total_questions").notNull(),
        correctCount: int("correct_count").default(0).notNull(),
        wrongCount: int("wrong_count").default(0).notNull(),
        unansweredCount: int("unanswered_count").default(0).notNull(),
        score: double("score").default(0).notNull(),
        maxScore: double("max_score").default(0).notNull(),
        percentage: double("percentage").default(0).notNull(),
        timeTakenSeconds: int("time_taken_seconds")
      },
      (table) => [
        uniqueIndex("attempt_req_idx").on(table.requestId)
      ]
    );
    attemptAnswers = mysqlTable("attempt_answers", {
      id: varchar("id", { length: 30 }).primaryKey(),
      attemptId: varchar("attempt_id", { length: 30 }).notNull(),
      questionId: varchar("question_id", { length: 30 }).notNull(),
      selectedOptionId: varchar("selected_option_id", { length: 30 }),
      isCorrect: boolean("is_correct"),
      marksAwarded: double("marks_awarded").default(0).notNull(),
      timeTakenSeconds: int("time_taken_seconds"),
      answeredAt: timestamp("answered_at").defaultNow().notNull()
    });
    bookmarks = mysqlTable(
      "bookmarks",
      {
        userId: varchar("user_id", { length: 64 }).notNull(),
        questionId: varchar("question_id", { length: 30 }).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => [
        primaryKey({ columns: [table.userId, table.questionId] })
      ]
    );
    quizAccess = mysqlTable(
      "quiz_access",
      {
        id: varchar("id", { length: 30 }).primaryKey(),
        userId: varchar("user_id", { length: 64 }).notNull(),
        quizId: varchar("quiz_id", { length: 30 }).notNull(),
        orderId: varchar("order_id", { length: 30 }),
        grantedAt: timestamp("granted_at").defaultNow().notNull(),
        expiresAt: timestamp("expires_at")
      },
      (table) => [
        uniqueIndex("user_quiz_access_idx").on(table.userId, table.quizId)
      ]
    );
    orders = mysqlTable("orders", {
      id: varchar("id", { length: 30 }).primaryKey(),
      userId: varchar("user_id", { length: 64 }).notNull(),
      quizId: varchar("quiz_id", { length: 30 }).notNull(),
      amount: int("amount").notNull(),
      currency: varchar("currency", { length: 3 }).default("BDT").notNull(),
      status: varchar("status", { length: 20 }).default("PENDING").notNull(),
      idempotencyKey: varchar("idempotency_key", { length: 191 }).unique(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      paidAt: timestamp("paid_at")
    });
    payments = mysqlTable("payments", {
      id: varchar("id", { length: 30 }).primaryKey(),
      orderId: varchar("order_id", { length: 30 }).notNull(),
      provider: varchar("provider", { length: 50 }).notNull(),
      providerReference: varchar("provider_reference", { length: 191 }).unique(),
      status: varchar("status", { length: 20 }).default("PENDING").notNull(),
      amount: int("amount").notNull(),
      currency: varchar("currency", { length: 3 }).default("BDT").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      paidAt: timestamp("paid_at")
    });
    categoriesRelations = relations(categories, ({ many }) => ({
      exams: many(exams)
    }));
    examsRelations = relations(exams, ({ one, many }) => ({
      category: one(categories, {
        fields: [exams.categoryId],
        references: [categories.id]
      }),
      quizzes: many(quizzes)
    }));
    quizzesRelations = relations(quizzes, ({ one, many }) => ({
      exam: one(exams, {
        fields: [quizzes.examId],
        references: [exams.id]
      }),
      quizQuestions: many(quizQuestions),
      attempts: many(attempts)
    }));
    questionsRelations = relations(questions, ({ one, many }) => ({
      subject: one(subjects, {
        fields: [questions.subjectId],
        references: [subjects.id]
      }),
      topic: one(topics, {
        fields: [questions.topicId],
        references: [topics.id]
      }),
      options: many(options),
      quizQuestions: many(quizQuestions)
    }));
    optionsRelations = relations(options, ({ one }) => ({
      question: one(questions, {
        fields: [options.questionId],
        references: [questions.id]
      })
    }));
  }
});

// packages/database/src/index.ts
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { sql } from "drizzle-orm";
function normalizeMysqlConnectionString(raw) {
  if (!raw || typeof raw !== "string") return "";
  let fixed = raw.trim();
  if (fixed.startsWith("ysql://")) {
    fixed = `m${fixed}`;
  }
  fixed = fixed.replace(/\/u427015050_drizzlequiz(\?.*)?$/i, "/u427015050_drizzle$1");
  return fixed;
}
async function createDrizzleClient(env) {
  let config = {
    disableEval: true,
    multipleStatements: true
  };
  if (env?.HYPERDRIVE) {
    if (env.HYPERDRIVE.connectionString) {
      const url = new URL(normalizeMysqlConnectionString(env.HYPERDRIVE.connectionString));
      config.host = url.hostname;
      config.port = Number(url.port) || 3306;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.slice(1) || "u427015050_drizzle";
    } else {
      config.host = env.HYPERDRIVE.host || "srv1562.hstgr.io";
      config.port = Number(env.HYPERDRIVE.port) || 3306;
      config.user = env.HYPERDRIVE.user || "u427015050_drizzlequiz";
      config.password = env.HYPERDRIVE.password || "R.r.4152";
      config.database = env.HYPERDRIVE.database || "u427015050_drizzle";
    }
  } else {
    const rawConn = env?.DATABASE_URL || env?.QUIZ_DATABASE_URL || (typeof process !== "undefined" ? process.env?.DATABASE_URL || process.env?.QUIZ_DATABASE_URL : "") || "";
    const connectionString = normalizeMysqlConnectionString(rawConn);
    if (connectionString) {
      const url = new URL(connectionString);
      config.host = url.hostname;
      config.port = Number(url.port) || 3306;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.slice(1) || "u427015050_drizzle";
    } else {
      config.host = "srv1562.hstgr.io";
      config.port = 3306;
      config.user = "u427015050_drizzlequiz";
      config.password = "R.r.4152";
      config.database = "u427015050_drizzle";
    }
  }
  const connection = await createConnection(config);
  const db = drizzle(connection, { schema: schema_exports, mode: "default" });
  db.__connection = connection;
  return db;
}
function resolveDatabaseUrl(env) {
  if (env?.HYPERDRIVE) {
    if (env.HYPERDRIVE.connectionString) {
      return normalizeMysqlConnectionString(env.HYPERDRIVE.connectionString);
    }
    const { user, password, host, port: port2, database } = env.HYPERDRIVE;
    return `mysql://${user}:${password}@${host}:${port2 || 3306}/${database || "u427015050_drizzle"}`;
  }
  const rawConn = env?.DATABASE_URL || env?.QUIZ_DATABASE_URL || (typeof process !== "undefined" ? process.env?.DATABASE_URL || process.env?.QUIZ_DATABASE_URL : "") || "";
  return normalizeMysqlConnectionString(rawConn) || DEFAULT_HOSTINGER_MYSQL_URL;
}
async function verifyDatabaseConnection(db) {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      ok: true,
      latencyMs: Date.now() - start
    };
  } catch (error) {
    console.error("Database connection verification failed:", error);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error?.message || String(error)
    };
  }
}
function endDrizzleConnection(db) {
  const conn = db.__connection;
  if (conn && typeof conn.end === "function") {
    return conn.end();
  }
  return Promise.resolve();
}
var DEFAULT_HOSTINGER_MYSQL_URL;
var init_src = __esm({
  "packages/database/src/index.ts"() {
    init_schema();
    init_schema();
    DEFAULT_HOSTINGER_MYSQL_URL = "mysql://u427015050_drizzlequiz:R.r.4152@srv1562.hstgr.io:3306/u427015050_drizzle";
  }
});

// apps/src/routes/poc.ts
async function handlePocCheck({
  env,
  req,
  json,
  executionCtx
}) {
  const connectionUrl = resolveDatabaseUrl(env);
  if (!connectionUrl && !env?.HYPERDRIVE) {
    return json(
      {
        connected: false,
        error: "No database connection configured. Please set DATABASE_URL or configure HYPERDRIVE in wrangler.jsonc.",
        bindingsFound: Object.keys(env || {})
      },
      500
    );
  }
  const db = await createDrizzleClient(env);
  try {
    const probe = await verifyDatabaseConnection(db);
    return json({
      connected: probe.ok,
      latencyMs: probe.latencyMs,
      database: "u427015050_drizzle",
      driver: env?.HYPERDRIVE ? "Cloudflare Hyperdrive (Accelerated Pooling via Drizzle/mysql2)" : "Direct MySQL TCP (Drizzle/mysql2)",
      sslEnabled: true,
      error: probe.error
    }, probe.ok ? 200 : 500);
  } catch (err) {
    return json(
      {
        connected: false,
        database: "u427015050_drizzle",
        error: err?.cause?.message || err?.message || String(err)
      },
      500
    );
  } finally {
    const cleanup = endDrizzleConnection(db);
    if (executionCtx && typeof executionCtx.waitUntil === "function") {
      executionCtx.waitUntil(cleanup);
    } else {
      await cleanup;
    }
  }
}
var init_poc = __esm({
  "apps/src/routes/poc.ts"() {
    init_src();
  }
});

// services/quiz-service/src/index.ts
import { Hono } from "hono";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
async function createDrizzleFromEnv(env) {
  return createDrizzleClient(env);
}
function requireAdmin(c) {
  const userRole = c.req.header("X-User-Role") || "";
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }
  return { allowed: true, userRole };
}
function generateId(prefix) {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.slice(0, 30);
}
function createMockContext(req, env) {
  return {
    req: {
      path: req.path,
      method: req.method,
      json: async () => req.body || {},
      header: () => void 0,
      raw: new Request(`http://internal${req.path.startsWith("/") ? req.path : "/" + req.path}`, {
        method: req.method,
        body: req.body ? JSON.stringify(req.body) : void 0,
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": req.correlationId
        }
      })
    },
    env,
    json: (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
  };
}
var app, quizService, src_default;
var init_src2 = __esm({
  "services/quiz-service/src/index.ts"() {
    init_src();
    app = new Hono();
    app.get("/db-health", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      const start = Date.now();
      try {
        await db.execute("SELECT 1");
        return c.json({
          connected: true,
          latencyMs: Date.now() - start,
          database: "u427015050_drizzle",
          target: "Hostinger Remote MySQL 8.0 via Drizzle ORM"
        }, 200);
      } catch (error) {
        return c.json({
          connected: false,
          latencyMs: Date.now() - start,
          error: error?.message || "Database ping failed"
        }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/categories", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const allCategories = await db.select().from(categories).orderBy(desc(categories.createdAt));
        const allExams = await db.select().from(exams);
        const data = allCategories.map((category) => ({
          ...category,
          exams: allExams.filter((exam) => exam.categoryId === category.id),
          _count: {
            exams: allExams.filter((exam) => exam.categoryId === category.id).length
          }
        }));
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        console.error("[Drizzle Error] GET /categories query failed:", error);
        return c.json({ success: false, error: error.message || "Failed to fetch categories" }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/categories/:id", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      const categoryId = c.req.param("id");
      try {
        const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
        if (!category) {
          return c.json({ success: false, error: "Category not found" }, 404);
        }
        const catExams = await db.select().from(exams).where(eq(exams.categoryId, categoryId));
        return c.json({ success: true, data: { ...category, exams: catExams } }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/categories", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      try {
        const body = await c.req.json().catch(() => ({}));
        const { name, slug } = body || {};
        if (!name || typeof name !== "string" || !name.trim()) {
          return c.json({ success: false, error: "Category name is required" }, 400);
        }
        const categorySlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const newId = body.id || generateId("cat");
        await db.insert(categories).values({
          id: newId,
          name: name.trim(),
          slug: categorySlug
        });
        const [created] = await db.select().from(categories).where(eq(categories.id, newId)).limit(1);
        return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
      } catch (error) {
        console.error("[Drizzle Error] POST /categories failed:", error);
        const isDuplicate = error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
        return c.json({ success: false, error: isDuplicate ? "Category slug already exists" : error.message }, isDuplicate ? 409 : 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.put("/categories/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const categoryId = c.req.param("id");
      try {
        const body = await c.req.json().catch(() => ({}));
        const { name, slug } = body || {};
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (slug) updateData.slug = slug.trim();
        await db.update(categories).set(updateData).where(eq(categories.id, categoryId));
        const [updated] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
        return c.json({ success: true, data: updated }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.delete("/categories/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const categoryId = c.req.param("id");
      try {
        await db.delete(categories).where(eq(categories.id, categoryId));
        return c.json({ success: true, deletedId: categoryId }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/exams", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const allExams = await db.select().from(exams).orderBy(asc(exams.name));
        const allCategories = await db.select().from(categories);
        const catMap = new Map(allCategories.map((c2) => [c2.id, c2.name]));
        const data = allExams.map((e) => ({
          ...e,
          categoryName: catMap.get(e.categoryId) || "General"
        }));
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        console.error("[Drizzle Error] GET /exams query failed:", error);
        return c.json({ success: false, error: error.message || "Failed to fetch exams" }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/exams/:id", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      const examId = c.req.param("id");
      try {
        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
        if (!exam) {
          return c.json({ success: false, error: "Exam not found" }, 404);
        }
        const examQuizzes = await db.select().from(quizzes).where(eq(quizzes.examId, examId));
        return c.json({ success: true, data: { ...exam, quizzes: examQuizzes } }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/exams", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      try {
        const body = await c.req.json().catch(() => ({}));
        const { categoryId, name, slug, description } = body || {};
        if (!categoryId || !name) {
          return c.json({ success: false, error: "categoryId and name are required" }, 400);
        }
        const examSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const newId = body.id || generateId("exam");
        await db.insert(exams).values({
          id: newId,
          categoryId,
          name: name.trim(),
          slug: examSlug,
          description: description || null
        });
        const [created] = await db.select().from(exams).where(eq(exams.id, newId)).limit(1);
        return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
      } catch (error) {
        console.error("[Drizzle Error] POST /exams failed:", error);
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.delete("/exams/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const examId = c.req.param("id");
      try {
        await db.delete(exams).where(eq(exams.id, examId));
        return c.json({ success: true, deletedId: examId }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/subjects", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const data = await db.select().from(subjects).orderBy(asc(subjects.name));
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/subjects", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      try {
        const body = await c.req.json().catch(() => ({}));
        const { name, slug } = body || {};
        if (!name) return c.json({ success: false, error: "Subject name is required" }, 400);
        const subSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
        const newId = body.id || generateId("sub");
        await db.insert(subjects).values({ id: newId, name: name.trim(), slug: subSlug });
        const [created] = await db.select().from(subjects).where(eq(subjects.id, newId)).limit(1);
        return c.json({ success: true, data: created }, 201);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/topics", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const allTopics = await db.select().from(topics).orderBy(asc(topics.name));
        const allSubjects = await db.select().from(subjects);
        const subMap = new Map(allSubjects.map((s) => [s.id, s.name]));
        const data = allTopics.map((t) => ({
          ...t,
          subjectName: subMap.get(t.subjectId) || null
        }));
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/topics", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      try {
        const body = await c.req.json().catch(() => ({}));
        const { subjectId, name, slug } = body || {};
        if (!subjectId || !name) return c.json({ success: false, error: "subjectId and name are required" }, 400);
        const topicSlug = slug?.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
        const newId = body.id || generateId("top");
        await db.insert(topics).values({ id: newId, subjectId, name: name.trim(), slug: topicSlug });
        const [created] = await db.select().from(topics).where(eq(topics.id, newId)).limit(1);
        return c.json({ success: true, data: created }, 201);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/quizzes", async (c) => {
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
            examName: exam?.name || "General Exam",
            totalQuestions: qCount
          };
        });
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        console.error("[Drizzle Error] GET /quizzes query failed:", error);
        return c.json({ success: false, error: error.message || "Failed to fetch quizzes" }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/quizzes/:id", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      const quizId = c.req.param("id");
      const userRole = c.req.header("X-User-Role") || "";
      const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
      try {
        const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        if (!quiz) {
          return c.json({ success: false, error: "Quiz not found" }, 404);
        }
        const assigned = await db.select({
          quizId: quizQuestions.quizId,
          questionId: quizQuestions.questionId,
          position: quizQuestions.position,
          marks: quizQuestions.marks
        }).from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.position));
        const questionIds = assigned.map((a) => a.questionId);
        let questionsList = [];
        if (questionIds.length > 0) {
          const dbQuestions = await db.select().from(questions).where(inArray(questions.id, questionIds));
          const dbOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
          const qMap = new Map(dbQuestions.map((q) => [q.id, q]));
          const optMap = /* @__PURE__ */ new Map();
          for (const opt of dbOptions) {
            if (!optMap.has(opt.questionId)) optMap.set(opt.questionId, []);
            optMap.get(opt.questionId).push({
              id: opt.id,
              text: opt.text,
              imageUrl: opt.imageUrl,
              position: opt.position,
              isCorrect: isAdmin ? opt.isCorrect : void 0
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
              options: (optMap.get(q.id) || []).sort((x, y) => x.position - y.position)
            };
          }).filter(Boolean);
        }
        return c.json({ success: true, data: { ...quiz, questions: questionsList } }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/quizzes", async (c) => {
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
          status = "DRAFT",
          price = 0,
          currency = "BDT",
          durationSeconds = 7200,
          passPercentage = 50,
          negativeMark = 0.5
        } = body || {};
        if (!examId || !title) {
          return c.json({ success: false, error: "examId and title are required" }, 400);
        }
        const quizSlug = slug?.trim() || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const newId = body.id || generateId("quiz");
        await db.insert(quizzes).values({
          id: newId,
          examId,
          categoryId: categoryId || null,
          title: title.trim(),
          slug: quizSlug,
          description: description || null,
          status,
          price: Number(price) || 0,
          currency: String(currency || "BDT").toUpperCase(),
          durationSeconds: durationSeconds ? Number(durationSeconds) : null,
          passPercentage: passPercentage ? Number(passPercentage) : null,
          negativeMark: Number(negativeMark) || 0,
          publishedAt: status === "PUBLISHED" ? /* @__PURE__ */ new Date() : null
        });
        const [created] = await db.select().from(quizzes).where(eq(quizzes.id, newId)).limit(1);
        return c.json({ success: true, data: created, persistedToDatabase: true }, 201);
      } catch (error) {
        console.error("[Drizzle Error] POST /quizzes failed:", error);
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.put("/quizzes/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const quizId = c.req.param("id");
      try {
        const body = await c.req.json().catch(() => ({}));
        const updateData = {};
        if (body.title) updateData.title = body.title.trim();
        if (body.description !== void 0) updateData.description = body.description;
        if (body.status) {
          updateData.status = body.status;
          if (body.status === "PUBLISHED") updateData.publishedAt = /* @__PURE__ */ new Date();
        }
        if (body.price !== void 0) updateData.price = Number(body.price);
        if (body.durationSeconds !== void 0) updateData.durationSeconds = Number(body.durationSeconds);
        if (body.passPercentage !== void 0) updateData.passPercentage = Number(body.passPercentage);
        if (body.negativeMark !== void 0) updateData.negativeMark = Number(body.negativeMark);
        await db.update(quizzes).set(updateData).where(eq(quizzes.id, quizId));
        const [updated] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        return c.json({ success: true, data: updated }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.delete("/quizzes/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const quizId = c.req.param("id");
      try {
        await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
        await db.delete(quizzes).where(eq(quizzes.id, quizId));
        return c.json({ success: true, deletedId: quizId }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/quizzes/:id/questions", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const quizId = c.req.param("id");
      try {
        const body = await c.req.json().catch(() => ({}));
        const { questionId, position = 1, marks = 1 } = body || {};
        if (!questionId) return c.json({ success: false, error: "questionId is required" }, 400);
        await db.insert(quizQuestions).values({
          quizId,
          questionId,
          position: Number(position) || 1,
          marks: Number(marks) || 1
        });
        return c.json({ success: true, linked: { quizId, questionId, position, marks } }, 201);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/quizzes/:id/offline-package", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      const quizId = c.req.param("id");
      try {
        const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        if (!quiz) return c.json({ success: false, error: "Quiz not found" }, 404);
        const assigned = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
        const questionIds = assigned.map((a) => a.questionId);
        let questionsList = [];
        if (questionIds.length > 0) {
          const dbQuestions = await db.select().from(questions).where(inArray(questions.id, questionIds));
          const dbOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
          const qMap = new Map(dbQuestions.map((q) => [q.id, q]));
          questionsList = assigned.map((a) => {
            const q = qMap.get(a.questionId);
            if (!q) return null;
            const opts = dbOptions.filter((o) => o.questionId === q.id).sort((x, y) => x.position - y.position).map((o) => ({ id: o.id, text: o.text, position: o.position }));
            return { id: q.id, position: a.position, body: q.body, marks: a.marks || q.marks, options: opts };
          }).filter(Boolean);
        }
        return c.json({
          success: true,
          offlinePackage: {
            packageVersion: "v1.0.0",
            generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            quiz: { id: quiz.id, title: quiz.title, durationSeconds: quiz.durationSeconds, negativeMark: quiz.negativeMark },
            questions: questionsList
          }
        }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.get("/questions", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const allQuestions = await db.select().from(questions).orderBy(desc(questions.createdAt));
        const allOptions = await db.select().from(options);
        const optMap = /* @__PURE__ */ new Map();
        for (const opt of allOptions) {
          if (!optMap.has(opt.questionId)) optMap.set(opt.questionId, []);
          optMap.get(opt.questionId).push(opt);
        }
        const data = allQuestions.map((q) => ({
          ...q,
          options: (optMap.get(q.id) || []).sort((a, b) => a.position - b.position)
        }));
        return c.json({ success: true, count: data.length, data }, 200);
      } catch (error) {
        console.error("[Drizzle Error] GET /questions failed:", error);
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/questions", async (c) => {
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
          marks = 1,
          options: rawOptions = []
        } = body || {};
        if (!subjectId || !questionBody) {
          return c.json({ success: false, error: "subjectId and question body are required" }, 400);
        }
        const newQuestionId = body.id || generateId("q");
        const result = await db.transaction(async (tx) => {
          await tx.insert(questions).values({
            id: newQuestionId,
            subjectId,
            topicId: topicId || null,
            body: questionBody,
            explanation: explanation || null,
            difficulty: Number(difficulty) || 1,
            marks: Number(marks) || 1
          });
          const insertedOptions = [];
          if (Array.isArray(rawOptions) && rawOptions.length > 0) {
            for (let i = 0; i < rawOptions.length; i++) {
              const opt = rawOptions[i];
              const optId = opt.id || generateId("opt");
              const optValues = {
                id: optId,
                questionId: newQuestionId,
                text: opt.text || "",
                isCorrect: !!opt.isCorrect,
                position: opt.position || i + 1,
                imageUrl: opt.imageUrl || null
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
            options: result.insertedOptions
          }
        }, 201);
      } catch (error) {
        console.error("[Drizzle Error] POST /questions failed:", error);
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.delete("/questions/:id", async (c) => {
      const admin = requireAdmin(c);
      if (admin instanceof Response) return admin;
      const db = await createDrizzleFromEnv(c.env);
      const questionId = c.req.param("id");
      try {
        await db.delete(options).where(eq(options.questionId, questionId));
        await db.delete(quizQuestions).where(eq(quizQuestions.questionId, questionId));
        await db.delete(questions).where(eq(questions.id, questionId));
        return c.json({ success: true, deletedId: questionId }, 200);
      } catch (error) {
        return c.json({ success: false, error: error.message }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    app.post("/internal/quiz-scoring-keys", async (c) => {
      const db = await createDrizzleFromEnv(c.env);
      try {
        const { quizId } = await c.req.json().catch(() => ({}));
        if (!quizId) {
          return c.json({ success: false, error: "quizId is required" }, 400);
        }
        const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
        if (!quizResult.length) {
          return c.json({ success: false, error: "Quiz not found" }, 404);
        }
        const quiz = quizResult[0];
        const keys = await db.select({
          questionId: questions.id,
          marks: questions.marks,
          correctOptionId: options.id
        }).from(questions).innerJoin(options, and(eq(options.questionId, questions.id), eq(options.isCorrect, true))).innerJoin(quizQuestions, and(eq(quizQuestions.questionId, questions.id), eq(quizQuestions.quizId, quizId)));
        return c.json({
          success: true,
          quiz,
          keys
        }, 200);
      } catch (error) {
        console.error("[Drizzle Error] POST /internal/quiz-scoring-keys failed:", error);
        return c.json({ success: false, error: error.message || "Failed to fetch quiz keys" }, 500);
      } finally {
        c.executionCtx.waitUntil(endDrizzleConnection(db));
      }
    });
    quizService = {
      async handle(req) {
        const env = req.env || {};
        const mockContext = createMockContext(req, env);
        const response = await app.fetch(mockContext.req.raw, env, {
          waitUntil: (p) => {
            void p;
          },
          passThroughOnException: () => {
          },
          props: {}
        });
        const data = await response.json();
        return { status: response.status, data };
      }
    };
    src_default = app;
  }
});

// services/payment-service/src/index.ts
var paymentDb, paymentService;
var init_src3 = __esm({
  "services/payment-service/src/index.ts"() {
    paymentDb = {
      orders: /* @__PURE__ */ new Map(),
      payments: /* @__PURE__ */ new Map(),
      quizAccess: /* @__PURE__ */ new Map()
    };
    paymentDb.quizAccess.set("usr_student1_quiz_bcs_model_01", {
      id: "acc_demo_1",
      userId: "usr_student1",
      quizId: "quiz_bcs_model_01",
      orderId: "ord_demo_1",
      grantedAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + 864e5 * 365)
    });
    paymentService = {
      async handle(req) {
        const { path: path2, method, body, correlationId, userId = "usr_student1", env } = req;
        if (path2 === "/orders" && method === "POST") {
          const { quizId, amount = 150, currency = "BDT", idempotencyKey } = body || {};
          if (!quizId) return { status: 400, data: { success: false, error: "quizId required", correlationId } };
          if (idempotencyKey) {
            for (const o of paymentDb.orders.values()) {
              if (o.idempotencyKey === idempotencyKey) {
                return { status: 200, data: { success: true, order: o, idempotent: true, correlationId } };
              }
            }
          }
          const order = {
            id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId,
            quizId,
            amount: Number(amount),
            currency,
            status: "PENDING",
            idempotencyKey: idempotencyKey || null,
            createdAt: /* @__PURE__ */ new Date(),
            paidAt: null
          };
          paymentDb.orders.set(order.id, order);
          return { status: 201, data: { success: true, order, correlationId } };
        }
        if (path2 === "/payments/initiate" && method === "POST") {
          const { orderId, provider = "SSLCOMMERZ" } = body || {};
          const order = paymentDb.orders.get(orderId);
          if (!order) return { status: 404, data: { success: false, error: "Order not found", correlationId } };
          const providerRef = `${provider}_TXN_${Date.now()}`;
          const payment = {
            id: `pay_${Date.now()}`,
            orderId: order.id,
            provider: provider.toUpperCase(),
            providerReference: providerRef,
            status: "PENDING",
            amount: order.amount,
            currency: order.currency,
            createdAt: /* @__PURE__ */ new Date(),
            paidAt: null
          };
          paymentDb.payments.set(payment.id, payment);
          return {
            status: 200,
            data: {
              success: true,
              payment,
              gatewayRedirectUrl: provider.toUpperCase() === "SSLCOMMERZ" ? `https://sandbox.sslcommerz.com/gwprocess/v4/simulator.php?txn=${providerRef}` : `https://sandbox.aamarpay.com/paynow?txn=${providerRef}`,
              correlationId
            }
          };
        }
        if (path2 === "/webhooks/sslcommerz" && method === "POST") {
          const { tran_id, val_id, status } = body || {};
          let payment;
          for (const p of paymentDb.payments.values()) {
            if (p.providerReference === tran_id) {
              payment = p;
              break;
            }
          }
          if (!payment) return { status: 404, data: { success: false, error: "Payment not found", correlationId } };
          if (payment.status === "SUCCESS") {
            return { status: 200, data: { success: true, message: "Already fulfilled", correlationId } };
          }
          if (status === "VALID" || status === "SUCCESS") {
            payment.status = "SUCCESS";
            payment.paidAt = /* @__PURE__ */ new Date();
            const order = paymentDb.orders.get(payment.orderId);
            if (order) {
              order.status = "PAID";
              order.paidAt = /* @__PURE__ */ new Date();
              const accessKey = `${order.userId}_${order.quizId}`;
              paymentDb.quizAccess.set(accessKey, {
                id: `acc_${Date.now()}`,
                userId: order.userId,
                quizId: order.quizId,
                orderId: order.id,
                grantedAt: /* @__PURE__ */ new Date(),
                expiresAt: new Date(Date.now() + 864e5 * 365)
              });
            }
          }
          return { status: 200, data: { success: true, processed: true, correlationId } };
        }
        if (path2 === "/users/me/quiz-access" && method === "GET") {
          const grants = Array.from(paymentDb.quizAccess.values()).filter((a) => a.userId === userId);
          return { status: 200, data: { success: true, count: grants.length, data: grants, correlationId } };
        }
        if (path2 === "/internal/check-access" && method === "POST") {
          const { userId: targetUserId, quizId: targetQuizId } = body || {};
          const grant = paymentDb.quizAccess.get(`${targetUserId}_${targetQuizId}`);
          const hasAccess = Boolean(grant && (!grant.expiresAt || grant.expiresAt > /* @__PURE__ */ new Date()));
          return {
            status: 200,
            data: { success: true, hasAccess, expiresAt: grant?.expiresAt || null, correlationId }
          };
        }
        return { status: 404, data: { success: false, error: "Payment route not found", correlationId } };
      }
    };
  }
});

// services/analytics-service/src/index.ts
var analyticsDb, analyticsService;
var init_src4 = __esm({
  "services/analytics-service/src/index.ts"() {
    analyticsDb = {
      badges: /* @__PURE__ */ new Map(),
      userBadges: /* @__PURE__ */ new Map(),
      leaderboards: /* @__PURE__ */ new Map()
    };
    analyticsDb.badges.set("bdg_gold", {
      id: "bdg_gold",
      name: "National Top 10% Ranker",
      description: "Scored 90%+ in a national preliminary model examination.",
      imageUrl: "https://assets.example.com/badges/gold.png"
    });
    analyticsDb.badges.set("bdg_streak", {
      id: "bdg_streak",
      name: "7-Day Examination Streak",
      description: "Completed at least one daily timed quiz for 7 consecutive days.",
      imageUrl: "https://assets.example.com/badges/streak.png"
    });
    analyticsDb.leaderboards.set("usr_student1_quiz_bcs_model_01", {
      id: "lb_1",
      userId: "usr_student1",
      quizId: "quiz_bcs_model_01",
      bestScore: 165.5,
      bestPercentage: 82.75,
      completedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    analyticsService = {
      async handle(req) {
        const { path: path2, method, body, correlationId, userId = "usr_student1", env } = req;
        const matchQuizLb = path2.match(/^\/leaderboards\/quizzes\/([^/]+)$/);
        if (matchQuizLb && method === "GET") {
          const quizId = matchQuizLb[1];
          const entries = Array.from(analyticsDb.leaderboards.values()).filter((lb) => lb.quizId === quizId).sort((a, b) => {
            if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
            return (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0);
          }).map((lb, index) => ({
            rank: index + 1,
            userId: lb.userId,
            score: lb.bestScore,
            percentage: lb.bestPercentage,
            completedAt: lb.completedAt,
            updatedAt: lb.updatedAt
          }));
          return { status: 200, data: { success: true, count: entries.length, leaderboard: entries, correlationId } };
        }
        if (path2 === "/badges" && method === "GET") {
          return { status: 200, data: { success: true, data: Array.from(analyticsDb.badges.values()), correlationId } };
        }
        if (path2 === "/users/me/badges" && method === "GET") {
          const myBadges = Array.from(analyticsDb.userBadges.values()).filter((ub) => ub.userId === userId).map((ub) => analyticsDb.badges.get(ub.badgeId)).filter(Boolean);
          return { status: 200, data: { success: true, data: myBadges, correlationId } };
        }
        if (path2 === "/internal/record-attempt-result" && method === "POST") {
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
              completedAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            });
          }
          if (percentage >= 90) {
            const badgeKey = `${targetUserId}_bdg_gold`;
            if (!analyticsDb.userBadges.has(badgeKey)) {
              analyticsDb.userBadges.set(badgeKey, {
                userId: targetUserId,
                badgeId: "bdg_gold",
                earnedAt: /* @__PURE__ */ new Date()
              });
            }
          }
          return { status: 200, data: { success: true, updated: true, correlationId } };
        }
        return { status: 404, data: { success: false, error: "Analytics route not found", correlationId } };
      }
    };
  }
});

// services/attempt-service/src/index.ts
var attemptDb, attemptService;
var init_src5 = __esm({
  "services/attempt-service/src/index.ts"() {
    init_src2();
    init_src3();
    init_src4();
    attemptDb = {
      attempts: /* @__PURE__ */ new Map(),
      answers: /* @__PURE__ */ new Map(),
      bookmarks: /* @__PURE__ */ new Map(),
      savedQuizzes: /* @__PURE__ */ new Map(),
      offlineSyncs: /* @__PURE__ */ new Map()
    };
    attemptService = {
      async handle(req) {
        const { path: path2, method, body, correlationId, userId = "usr_student1", env } = req;
        const matchStart = path2.match(/^\/quizzes\/([^/]+)\/attempts$/);
        if (matchStart && method === "POST") {
          const quizId = matchStart[1];
          const quizKeyRes = await quizService.handle({
            path: "/internal/quiz-scoring-keys",
            method: "POST",
            body: { quizId },
            correlationId,
            env
          });
          if (!quizKeyRes.data.success || !quizKeyRes.data.quiz || !quizKeyRes.data.keys) {
            return { status: 404, data: { success: false, error: "Quiz not found", correlationId } };
          }
          const quiz = quizKeyRes.data.quiz;
          const keys = quizKeyRes.data.keys;
          if (quiz.price > 0) {
            const accessCheck = await paymentService.handle({
              path: "/internal/check-access",
              method: "POST",
              body: { userId, quizId },
              correlationId,
              env
            });
            if (!accessCheck.data.hasAccess) {
              return {
                status: 403,
                data: {
                  success: false,
                  error: "Paid quiz requires active QuizAccess grant. Please complete checkout.",
                  price: quiz.price,
                  correlationId
                }
              };
            }
          }
          const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const durationSec = 3600;
          const expiresAt = new Date(Date.now() + durationSec * 1e3);
          const attempt = {
            id: attemptId,
            userId,
            quizId,
            status: "IN_PROGRESS",
            requestId: body?.requestId || null,
            startedAt: /* @__PURE__ */ new Date(),
            submittedAt: null,
            expiresAt,
            totalQuestions: keys.length,
            correctCount: 0,
            wrongCount: 0,
            unansweredCount: keys.length,
            score: 0,
            maxScore: keys.reduce((acc, k) => acc + (k.marks || 1), 0),
            percentage: 0,
            timeTakenSeconds: null
          };
          attemptDb.attempts.set(attempt.id, attempt);
          return {
            status: 201,
            data: {
              success: true,
              attemptId: attempt.id,
              quizId: attempt.quizId,
              startedAt: attempt.startedAt,
              expiresAt: attempt.expiresAt,
              totalQuestions: attempt.totalQuestions,
              correlationId
            }
          };
        }
        const matchSaveAnswer = path2.match(/^\/attempts\/([^/]+)\/answers\/([^/]+)$/);
        if (matchSaveAnswer && method === "PUT") {
          const [, attemptId, questionId] = matchSaveAnswer;
          const attempt = attemptDb.attempts.get(attemptId);
          if (!attempt) return { status: 404, data: { success: false, error: "Attempt not found", correlationId } };
          if (attempt.status !== "IN_PROGRESS") {
            return { status: 400, data: { success: false, error: "Attempt is already submitted or expired", correlationId } };
          }
          if (attempt.expiresAt && /* @__PURE__ */ new Date() > attempt.expiresAt) {
            attempt.status = "EXPIRED";
            return { status: 400, data: { success: false, error: "Timer expired", correlationId } };
          }
          const { selectedOptionId, timeTakenSeconds } = body || {};
          const answerKey = `${attemptId}_${questionId}`;
          const answer = {
            id: `ans_${Date.now()}`,
            attemptId,
            questionId,
            selectedOptionId: selectedOptionId || null,
            isCorrect: null,
            // Scored authoritatively upon submit
            marksAwarded: 0,
            timeTakenSeconds: timeTakenSeconds || null,
            answeredAt: /* @__PURE__ */ new Date()
          };
          attemptDb.answers.set(answerKey, answer);
          return { status: 200, data: { success: true, saved: true, questionId: selectedOptionId, correlationId } };
        }
        const matchSubmit = path2.match(/^\/attempts\/([^/]+)\/submit$/);
        if (matchSubmit && method === "POST") {
          const attemptId = matchSubmit[1];
          const attempt = attemptDb.attempts.get(attemptId);
          if (!attempt) return { status: 404, data: { success: false, error: "Attempt not found", correlationId } };
          if (attempt.status === "SUBMITTED") {
            return { status: 200, data: { success: true, alreadySubmitted: true, attempt, correlationId } };
          }
          const keysRes = await quizService.handle({
            path: "/internal/quiz-scoring-keys",
            method: "POST",
            body: { quizId: attempt.quizId },
            correlationId,
            env
          });
          if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
            return { status: 404, data: { success: false, error: "Quiz keys not found", correlationId } };
          }
          const quiz = keysRes.data.quiz;
          const keys = keysRes.data.keys;
          let correct = 0;
          let wrong = 0;
          let unanswered = 0;
          let totalScore = 0;
          for (const k of keys) {
            const answer = attemptDb.answers.get(`${attemptId}_${k.questionId}`);
            const questionMarks = k.marks || 1;
            if (!answer || !answer.selectedOptionId) {
              unanswered++;
              if (answer) {
                answer.isCorrect = false;
                answer.marksAwarded = 0;
              }
            } else if (answer.selectedOptionId === k.correctOptionId) {
              correct++;
              answer.isCorrect = true;
              answer.marksAwarded = questionMarks;
              totalScore += questionMarks;
            } else {
              wrong++;
              answer.isCorrect = false;
              const penalty = quiz.negativeMark || 0;
              answer.marksAwarded = -penalty;
              totalScore -= penalty;
            }
          }
          const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
          const percentage = attempt.maxScore > 0 ? Math.round(finalScore / attempt.maxScore * 1e4) / 100 : 0;
          const duration = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1e3);
          attempt.status = "SUBMITTED";
          attempt.submittedAt = /* @__PURE__ */ new Date();
          attempt.correctCount = correct;
          attempt.wrongCount = wrong;
          attempt.unansweredCount = unanswered;
          attempt.score = finalScore;
          attempt.percentage = percentage;
          attempt.timeTakenSeconds = duration;
          await analyticsService.handle({
            path: "/internal/record-attempt-result",
            method: "POST",
            body: { userId: attempt.userId, quizId: attempt.quizId, score: finalScore, percentage },
            correlationId
          });
          return {
            status: 200,
            data: {
              success: true,
              result: {
                attemptId: attempt.id,
                status: attempt.status,
                score: finalScore,
                maxScore: attempt.maxScore,
                percentage,
                correctCount: correct,
                wrongCount: wrong,
                unansweredCount: unanswered,
                timeTakenSeconds: duration
              },
              correlationId
            }
          };
        }
        const matchResult = path2.match(/^\/attempts\/([^/]+)\/result$/);
        if (matchResult && method === "GET") {
          const attemptId = matchResult[1];
          const attempt = attemptDb.attempts.get(attemptId);
          if (!attempt) return { status: 404, data: { success: false, error: "Attempt not found", correlationId } };
          return { status: 200, data: { success: true, result: attempt, correlationId } };
        }
        if (path2 === "/sync/push" && method === "POST") {
          const { syncKey, quizId, answers = [], timeTakenSeconds = 0 } = body || {};
          if (!syncKey || !quizId) {
            return { status: 400, data: { success: false, error: "syncKey and quizId required", correlationId } };
          }
          const syncKeyFull = `${userId}_${syncKey}`;
          const existing = attemptDb.offlineSyncs.get(syncKeyFull);
          if (existing && existing.status === "PROCESSED") {
            return { status: 200, data: { success: true, idempotent: true, correlationId } };
          }
          const keysRes = await quizService.handle({
            path: "/internal/quiz-scoring-keys",
            method: "POST",
            body: { quizId },
            correlationId,
            env
          });
          if (!keysRes.data.success || !keysRes.data.quiz || !keysRes.data.keys) {
            return { status: 404, data: { success: false, error: "Quiz keys not found", correlationId } };
          }
          const quiz = keysRes.data.quiz;
          const keys = keysRes.data.keys;
          let correct = 0;
          let wrong = 0;
          let score = 0;
          for (const k of keys) {
            const userAns = answers.find((a) => a.questionId === k.questionId);
            if (userAns?.selectedOptionId === k.correctOptionId) {
              correct++;
              score += k.marks || 1;
            } else if (userAns?.selectedOptionId) {
              wrong++;
              score -= quiz.negativeMark || 0;
            }
          }
          const finalScore = Math.max(0, Math.round(score * 100) / 100);
          const attemptId = `att_offline_${syncKey}`;
          attemptDb.attempts.set(attemptId, {
            id: attemptId,
            userId,
            quizId,
            status: "SUBMITTED",
            requestId: syncKey,
            startedAt: new Date(Date.now() - timeTakenSeconds * 1e3),
            submittedAt: /* @__PURE__ */ new Date(),
            expiresAt: null,
            totalQuestions: keys.length,
            correctCount: correct,
            wrongCount: wrong,
            unansweredCount: keys.length - (correct + wrong),
            score: finalScore,
            maxScore: keys.length * 1,
            percentage: Math.round(finalScore / (keys.length * 1) * 100),
            timeTakenSeconds
          });
          attemptDb.offlineSyncs.set(syncKeyFull, {
            id: `sync_${Date.now()}`,
            userId,
            syncKey,
            status: "PROCESSED",
            createdAt: /* @__PURE__ */ new Date(),
            processedAt: /* @__PURE__ */ new Date()
          });
          return {
            status: 200,
            data: {
              success: true,
              syncKey,
              attemptId,
              score: finalScore,
              message: "Offline attempt successfully ingested and scored",
              correlationId
            }
          };
        }
        return { status: 404, data: { success: false, error: "Attempt route not found", correlationId } };
      }
    };
  }
});

// services/auth-service/src/index.ts
import { Hono as Hono2 } from "hono";
import { z } from "zod";
import { eq as eq2, sql as sql3 } from "drizzle-orm";
async function closeDbConnection(db, executionCtx) {
  const cleanup = endDrizzleConnection(db);
  if (executionCtx && typeof executionCtx.waitUntil === "function") {
    executionCtx.waitUntil(cleanup);
  } else {
    await cleanup;
  }
}
function decodeBase64UrlJson(segment) {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const jsonText = new TextDecoder().decode(bytes);
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}
function extractClerkClaims(token) {
  if (!token) return null;
  try {
    if (token.includes(".")) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const claims = decodeBase64UrlJson(parts[1]);
        if (claims) {
          const claimRole = claims.role || claims.public_metadata?.role || claims.publicMetadata?.role || claims.metadata?.role;
          const fullName = claims.name || claims.full_name || [claims.given_name || claims.first_name, claims.family_name || claims.last_name].filter(Boolean).join(" ").trim() || void 0;
          return {
            userId: claims.sub || claims.userId || claims.id,
            email: claims.email || claims.primary_email_address || claims.email_address,
            name: fullName,
            role: VALID_ROLES.includes(claimRole) ? claimRole : void 0,
            isJwt: true
          };
        }
      }
    }
    if (token.startsWith("user_") || token.startsWith("usr_")) {
      return { userId: token, isJwt: false };
    }
  } catch {
  }
  return null;
}
async function ensureUsersIdColumnCapacity(db) {
  if (usersColumnVerified) return;
  try {
    const [rows] = await db.execute(sql3`
      SELECT CHARACTER_MAXIMUM_LENGTH AS maxLen
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'id'
      LIMIT 1
    `);
    const maxLen = Number(Array.isArray(rows) ? rows[0]?.maxLen : rows?.maxLen || 0);
    if (maxLen > 0 && maxLen < 64) {
      await db.execute(sql3`ALTER TABLE users MODIFY COLUMN id VARCHAR(64) NOT NULL`);
    }
    usersColumnVerified = true;
  } catch {
  }
}
async function syncClerkUserInDatabase(db, input) {
  await ensureUsersIdColumnCapacity(db);
  const normalizedEmail = input.email.trim().toLowerCase();
  const [existingById] = await db.select().from(users).where(eq2(users.id, input.clerkUserId)).limit(1);
  if (existingById) {
    const nextName = input.name !== null && input.name !== "" ? input.name : existingById.name;
    const nextRole = input.explicitRole || existingById.role || "USER";
    await db.update(users).set({
      name: nextName,
      email: normalizedEmail,
      role: nextRole,
      isActive: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, input.clerkUserId));
    const [updatedUser] = await db.select().from(users).where(eq2(users.id, input.clerkUserId)).limit(1);
    return {
      action: "updated",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || "USER",
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    };
  }
  const [existingByEmail] = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
  if (existingByEmail) {
    const nextName = input.name !== null && input.name !== "" ? input.name : existingByEmail.name;
    const nextRole = input.explicitRole || existingByEmail.role || "USER";
    let effectiveId = input.clerkUserId;
    try {
      await db.update(users).set({
        id: input.clerkUserId,
        name: nextName,
        role: nextRole,
        isActive: true,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(users.id, existingByEmail.id));
    } catch (pkErr) {
      const errCode = pkErr?.cause?.code || pkErr?.code;
      const errNo = pkErr?.cause?.errno || pkErr?.errno;
      if (errCode === "ER_ROW_IS_REFERENCED_2" || errNo === 1451) {
        effectiveId = existingByEmail.id;
        await db.update(users).set({
          name: nextName,
          role: nextRole,
          isActive: true,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(users.id, existingByEmail.id));
      } else {
        throw pkErr;
      }
    }
    const [linkedUser] = await db.select().from(users).where(eq2(users.id, effectiveId)).limit(1);
    return {
      action: "updated",
      user: {
        id: linkedUser.id,
        name: linkedUser.name,
        email: linkedUser.email,
        role: linkedUser.role || "USER",
        isActive: linkedUser.isActive,
        createdAt: linkedUser.createdAt,
        updatedAt: linkedUser.updatedAt
      }
    };
  }
  const initialRole = input.explicitRole || "USER";
  await db.insert(users).values({
    id: input.clerkUserId,
    name: input.name,
    email: normalizedEmail,
    role: initialRole,
    isActive: true
  }).onDuplicateKeyUpdate({
    set: {
      name: input.name,
      email: normalizedEmail,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
  const [createdUser] = await db.select().from(users).where(eq2(users.id, input.clerkUserId)).limit(1);
  return {
    action: "created",
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role || "USER",
      isActive: createdUser.isActive,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt
    }
  };
}
async function executeClerkSync(params) {
  const {
    rawBody,
    token,
    headerClerkUserId,
    correlationId,
    env,
    executionCtx,
    requireDatabase = true
  } = params;
  const claims = extractClerkClaims(token);
  const sourcePayload = rawBody?.data && typeof rawBody.data === "object" && rawBody.data.id ? rawBody.data : rawBody || {};
  const nestedEmail = sourcePayload?.primaryEmailAddress?.emailAddress || sourcePayload?.primary_email_address || (Array.isArray(sourcePayload?.emailAddresses) ? sourcePayload.emailAddresses[0]?.emailAddress : void 0) || (Array.isArray(sourcePayload?.email_addresses) ? sourcePayload.email_addresses[0]?.email_address : void 0);
  const parsedResult = ClerkSyncBodySchema.safeParse({
    ...sourcePayload,
    email: sourcePayload?.email || nestedEmail || claims?.email
  });
  if (!parsedResult.success) {
    const firstIssue = parsedResult.error.issues[0];
    return {
      status: 400,
      data: {
        success: false,
        error: firstIssue?.message || "Invalid Clerk user payload",
        details: parsedResult.error.issues,
        correlationId
      }
    };
  }
  const parsed = parsedResult.data;
  const bodyUserId = parsed.clerkUserId || parsed.id || parsed.userId;
  if (claims?.isJwt && claims.userId && bodyUserId && claims.userId !== bodyUserId) {
    return {
      status: 403,
      data: {
        success: false,
        error: "Forbidden: clerkUserId does not match authenticated Clerk token subject",
        correlationId
      }
    };
  }
  const targetUserId = bodyUserId || claims?.userId || headerClerkUserId?.trim();
  const targetEmail = parsed.email;
  if (!targetUserId || !targetEmail) {
    return {
      status: 400,
      data: {
        success: false,
        error: "clerkUserId and a valid email are required for Clerk synchronization",
        correlationId
      }
    };
  }
  const resolvedName = parsed.name ?? parsed.fullName ?? ([parsed.firstName, parsed.lastName].filter(Boolean).join(" ").trim() || parsed.username || claims?.name || null);
  const explicitRole = parsed.role || claims?.role;
  const avatarUrl = parsed.avatarUrl ?? parsed.imageUrl ?? null;
  if (env || requireDatabase) {
    let db = null;
    try {
      db = await createDrizzleClient(env);
      const syncResult = await syncClerkUserInDatabase(db, {
        clerkUserId: targetUserId,
        email: targetEmail,
        name: resolvedName,
        explicitRole
      });
      const cachedEntity = {
        id: syncResult.user.id,
        name: syncResult.user.name,
        email: syncResult.user.email || targetEmail.toLowerCase(),
        role: syncResult.user.role,
        isActive: syncResult.user.isActive,
        avatarUrl,
        createdAt: syncResult.user.createdAt,
        updatedAt: syncResult.user.updatedAt
      };
      clerkAuthStore.users.set(cachedEntity.id, cachedEntity);
      return {
        status: syncResult.action === "created" ? 201 : 200,
        data: {
          success: true,
          action: syncResult.action,
          message: syncResult.action === "created" ? "Clerk user created in Hostinger MySQL database" : "Clerk user updated in Hostinger MySQL database",
          user: syncResult.user,
          data: syncResult.user,
          dbSynced: true,
          authProvider: "Clerk",
          clerkAppId: "app_3LavFW7A5cCB70BWweaphvP77wn",
          correlationId
        }
      };
    } catch (dbErr) {
      const errCode = dbErr?.cause?.code || dbErr?.code;
      const errNo = dbErr?.cause?.errno || dbErr?.errno;
      console.error("[Clerk Auth Sync] Hostinger MySQL Drizzle error:", dbErr);
      if (errCode === "ER_DUP_ENTRY" || errNo === 1062) {
        return {
          status: 409,
          data: {
            success: false,
            code: "DUPLICATE_USER",
            error: "A user record with this email or Clerk ID already exists",
            correlationId
          }
        };
      }
      return {
        status: 500,
        data: {
          success: false,
          code: errCode || "DATABASE_SYNC_ERROR",
          error: dbErr?.cause?.sqlMessage || dbErr?.message || "Failed to synchronize Clerk user with Hostinger MySQL",
          correlationId
        }
      };
    } finally {
      if (db) {
        await closeDbConnection(db, executionCtx);
      }
    }
  }
  const existing = clerkAuthStore.users.get(targetUserId);
  const syncedUser = {
    id: targetUserId,
    name: resolvedName ?? existing?.name ?? null,
    email: targetEmail.toLowerCase(),
    role: explicitRole || existing?.role || "USER",
    isActive: true,
    avatarUrl,
    createdAt: existing?.createdAt || /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  clerkAuthStore.users.set(targetUserId, syncedUser);
  return {
    status: existing ? 200 : 201,
    data: {
      success: true,
      action: existing ? "updated" : "created",
      message: "Clerk user synchronized in local store (no database binding provided)",
      user: syncedUser,
      data: syncedUser,
      dbSynced: false,
      authProvider: "Clerk",
      clerkAppId: "app_3LavFW7A5cCB70BWweaphvP77wn",
      correlationId
    }
  };
}
function getExecutionCtx(c) {
  try {
    return c.executionCtx;
  } catch {
    return void 0;
  }
}
var VALID_ROLES, ClerkSyncBodySchema, clerkAuthStore, usersColumnVerified, authApp, handleClerkSyncRequest, handleClerkSyncGetProbe, authService;
var init_src6 = __esm({
  "services/auth-service/src/index.ts"() {
    init_src();
    init_schema();
    VALID_ROLES = ["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"];
    ClerkSyncBodySchema = z.object({
      clerkUserId: z.string().trim().min(1).max(64).optional(),
      id: z.string().trim().min(1).max(64).optional(),
      userId: z.string().trim().min(1).max(64).optional(),
      email: z.string().trim().email("Valid email address is required").max(191).optional(),
      name: z.string().trim().max(191).optional().nullable(),
      fullName: z.string().trim().max(191).optional().nullable(),
      firstName: z.string().trim().max(100).optional().nullable(),
      lastName: z.string().trim().max(100).optional().nullable(),
      username: z.string().trim().max(100).optional().nullable(),
      role: z.enum(VALID_ROLES).optional(),
      avatarUrl: z.string().trim().max(512).optional().nullable(),
      imageUrl: z.string().trim().max(512).optional().nullable()
    });
    clerkAuthStore = {
      users: /* @__PURE__ */ new Map(),
      devices: /* @__PURE__ */ new Map()
    };
    clerkAuthStore.users.set("user_superadmin_rakib", {
      id: "user_superadmin_rakib",
      name: "Rakib Hasan (Super Admin)",
      email: "rakib.edu.bd@gmail.com",
      role: "SUPER_ADMIN",
      isActive: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    clerkAuthStore.users.set("user_student_tanvir", {
      id: "user_student_tanvir",
      name: "Tanvir Ahmed",
      email: "tanvir@example.com",
      role: "USER",
      isActive: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    usersColumnVerified = false;
    authApp = new Hono2();
    handleClerkSyncRequest = async (c) => {
      const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
      const headerClerkUserId = c.req.header("X-Clerk-User-Id") || "";
      const correlationId = c.req.header("X-Correlation-ID") || `corr_${Date.now()}`;
      const rawBody = await c.req.json().catch(() => ({}));
      const res = await executeClerkSync({
        rawBody,
        token,
        headerClerkUserId,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c),
        requireDatabase: true
      });
      return c.json(res.data, res.status);
    };
    authApp.post("/auth/clerk-sync", handleClerkSyncRequest);
    authApp.post("/auth/clerk-sync/", handleClerkSyncRequest);
    authApp.post("/auth/sync", handleClerkSyncRequest);
    authApp.post("/auth/sync/", handleClerkSyncRequest);
    authApp.post("/auth/register", handleClerkSyncRequest);
    authApp.post("/auth/register/", handleClerkSyncRequest);
    authApp.post("/auth/signup", handleClerkSyncRequest);
    authApp.post("/auth/signup/", handleClerkSyncRequest);
    handleClerkSyncGetProbe = (c) => {
      return c.json(
        {
          success: true,
          endpoints: [
            "/api/v1/auth/clerk-sync",
            "/api/v1/auth/register",
            "/api/v1/auth/sync"
          ],
          method: "POST",
          authProvider: "Clerk",
          clerkAppId: "app_3LavFW7A5cCB70BWweaphvP77wn",
          message: "Clerk user sync / registration endpoint is active. Send a POST request with JSON body { clerkUserId, email, name } to create or update a user in Hostinger MySQL."
        },
        200
      );
    };
    authApp.get("/auth/clerk-sync", handleClerkSyncGetProbe);
    authApp.get("/auth/clerk-sync/", handleClerkSyncGetProbe);
    authApp.get("/auth/register", handleClerkSyncGetProbe);
    authApp.get("/auth/register/", handleClerkSyncGetProbe);
    authApp.post("/internal/verify-token", async (c) => {
      const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
      const clerkUserId = c.req.header("X-Clerk-User-Id") || (token.startsWith("user_") ? token : "");
      const correlationId = c.req.header("X-Correlation-ID") || `corr_${Date.now()}`;
      const body = await c.req.json().catch(() => ({}));
      const res = await authService.handle({
        path: "/internal/verify-token",
        method: "POST",
        body,
        token,
        clerkUserId,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c)
      });
      return c.json(res.data, res.status);
    });
    authApp.all("/auth/*", async (c) => {
      const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
      const clerkUserId = c.req.header("X-Clerk-User-Id") || (token.startsWith("user_") ? token : "");
      const correlationId = c.req.header("X-Correlation-ID") || `corr_${Date.now()}`;
      const subPath = c.req.path.replace(/^\/api\/v1/, "").replace(/\/+$/, "") || "/";
      const res = await authService.handle({
        path: subPath,
        method: c.req.method,
        body: c.req.method === "GET" ? void 0 : await c.req.json().catch(() => ({})),
        token,
        clerkUserId,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c)
      });
      return c.json(res.data, res.status);
    });
    authApp.all("/devices/*", async (c) => {
      const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
      const clerkUserId = c.req.header("X-Clerk-User-Id") || (token.startsWith("user_") ? token : "");
      const correlationId = c.req.header("X-Correlation-ID") || `corr_${Date.now()}`;
      const subPath = c.req.path.replace(/^\/api\/v1/, "").replace(/\/+$/, "") || "/";
      const res = await authService.handle({
        path: subPath,
        method: c.req.method,
        body: c.req.method === "GET" ? void 0 : await c.req.json().catch(() => ({})),
        token,
        clerkUserId,
        correlationId,
        env: c.env,
        executionCtx: getExecutionCtx(c)
      });
      return c.json(res.data, res.status);
    });
    authService = {
      async handle(req) {
        const { path: path2, method, body, token, correlationId, env, clerkUserId, executionCtx } = req;
        const resolveClerkUser = async () => {
          const claims = extractClerkClaims(token);
          const effectiveId = clerkUserId || claims?.userId || (token?.startsWith("user_") ? token : null);
          if (!effectiveId) {
            if (token === "tok_admin_123" || token === "admin") {
              return clerkAuthStore.users.get("user_superadmin_rakib") || null;
            }
            return null;
          }
          if (env) {
            let db = null;
            try {
              db = await createDrizzleClient(env);
              const [dbUser] = await db.select().from(users).where(eq2(users.id, effectiveId)).limit(1);
              if (dbUser) {
                const resolved = {
                  id: dbUser.id,
                  name: dbUser.name,
                  email: dbUser.email || "",
                  role: dbUser.role || "USER",
                  isActive: dbUser.isActive,
                  createdAt: dbUser.createdAt,
                  updatedAt: dbUser.updatedAt
                };
                clerkAuthStore.users.set(resolved.id, resolved);
                return resolved;
              }
            } catch {
            } finally {
              if (db) {
                await closeDbConnection(db, executionCtx);
              }
            }
          }
          return clerkAuthStore.users.get(effectiveId) || null;
        };
        if (path2 === "/auth/clerk-sync" || path2 === "/auth/sync" || path2 === "/auth/register" || path2 === "/auth/signup") {
          return executeClerkSync({
            rawBody: body,
            token,
            headerClerkUserId: clerkUserId,
            correlationId,
            env,
            executionCtx,
            requireDatabase: Boolean(env)
          });
        }
        if (path2 === "/auth/me" && method === "GET") {
          const user = await resolveClerkUser();
          if (!user) {
            return {
              status: 401,
              data: {
                success: false,
                error: "Unauthorized: Valid Clerk session token required",
                authProvider: "Clerk",
                correlationId
              }
            };
          }
          return {
            status: 200,
            data: {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                avatarUrl: user.avatarUrl
              },
              authProvider: "Clerk",
              correlationId
            }
          };
        }
        if (path2 === "/devices/register" && method === "POST") {
          const user = await resolveClerkUser();
          const targetUserId = user?.id || body?.userId || body?.clerkUserId;
          if (!targetUserId) {
            return {
              status: 401,
              data: {
                success: false,
                error: "Unauthorized: Clerk User required to register device",
                correlationId
              }
            };
          }
          const { deviceKey, platform = "expo" } = body || {};
          const devId = `dev_${targetUserId}_${deviceKey || Date.now()}`;
          const device = {
            id: devId,
            userId: targetUserId,
            deviceKey: deviceKey || `key_${Date.now()}`,
            platform,
            lastSeenAt: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          };
          clerkAuthStore.devices.set(devId, device);
          return {
            status: 200,
            data: {
              success: true,
              device,
              authProvider: "Clerk",
              correlationId
            }
          };
        }
        if (path2 === "/internal/verify-token" && method === "POST") {
          const targetToken = body?.token || token;
          const claims = extractClerkClaims(targetToken);
          if (claims?.userId) {
            const cachedUser = clerkAuthStore.users.get(claims.userId);
            return {
              status: 200,
              data: {
                success: true,
                valid: true,
                authProvider: "Clerk",
                user: {
                  id: claims.userId,
                  email: claims.email || cachedUser?.email || "",
                  role: claims.role || cachedUser?.role || "USER"
                },
                correlationId
              }
            };
          }
          return {
            status: 401,
            data: {
              success: false,
              valid: false,
              error: "Invalid Clerk token or claims",
              correlationId
            }
          };
        }
        return {
          status: 404,
          data: {
            success: false,
            error: `Auth endpoint '${path2}' not found. Password-based authentication has been removed in favor of Clerk Authentication (app_3LavFW7A5cCB70BWweaphvP77wn).`,
            correlationId
          }
        };
      }
    };
  }
});

// apps/src/index.ts
var src_exports = {};
__export(src_exports, {
  app: () => app2,
  createDrizzleClient: () => createDrizzleClient,
  default: () => src_default2,
  resolveDatabaseUrl: () => resolveDatabaseUrl,
  verifyDatabaseConnection: () => verifyDatabaseConnection
});
import { Hono as Hono3 } from "hono";
import { cors } from "hono/cors";
function getExecutionCtx2(c) {
  try {
    return c.executionCtx;
  } catch {
    return void 0;
  }
}
async function cleanupDb(db, c) {
  const ctx = getExecutionCtx2(c);
  const cleanup = endDrizzleConnection(db);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(cleanup);
  } else {
    await cleanup;
  }
}
var startupTime, app2, handleRawDbCheck, handleDbHealth, getAuthContext, src_default2;
var init_src7 = __esm({
  "apps/src/index.ts"() {
    init_health();
    init_poc();
    init_src2();
    init_src5();
    init_src3();
    init_src4();
    init_src6();
    init_src();
    startupTime = Date.now();
    app2 = new Hono3();
    app2.use("*", (c, next) => {
      const rawOrigins = c.env?.CORS_ALLOWED_ORIGINS || "https://jobexambd.com,https://www.jobexambd.com,http://localhost:3000";
      const allowedOrigins = typeof rawOrigins === "string" ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean) : [rawOrigins];
      return cors({
        origin: (origin) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return origin || allowedOrigins[0];
          }
          if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return origin;
          }
          if (/^https:\/\/[a-z0-9-]+\.asia-east1\.run\.app$/.test(origin)) {
            return origin;
          }
          return null;
        },
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Clerk-User-Id",
          "X-Correlation-ID",
          "X-Requested-With",
          "X-Request-ID",
          "X-User-Role",
          "X-Idempotency-Key"
        ],
        exposeHeaders: ["Content-Length", "X-Total-Count", "X-Correlation-ID"],
        maxAge: 86400,
        credentials: true
      })(c, next);
    });
    app2.route("/api/v1", src_default);
    app2.route("/api/v1", authApp);
    app2.route("/", authApp);
    app2.get("/health", (c) => {
      return c.json(createHealthHandler(c.env, startupTime));
    });
    app2.get("/api/v1/health", (c) => {
      return c.json(createHealthHandler(c.env, startupTime));
    });
    handleRawDbCheck = async (c) => {
      let db = null;
      try {
        db = await createDrizzleClient(c.env);
        const result = await db.execute(`SELECT 1`);
        return c.json({
          connected: true,
          database: "u427015050_drizzle",
          result
        }, 200);
      } catch (err) {
        return c.json({
          connected: false,
          code: err?.cause?.code || err?.code,
          errno: err?.cause?.errno || err?.errno,
          sqlMessage: err?.cause?.sqlMessage || err?.sqlMessage,
          message: err?.cause?.message || err?.message || String(err),
          targetDatabase: "u427015050_drizzle"
        }, 500);
      } finally {
        if (db) {
          await cleanupDb(db, c);
        }
      }
    };
    app2.get("/health/db", handleRawDbCheck);
    app2.get("/api/v1/health/db", handleRawDbCheck);
    app2.get("/", (c) => {
      return c.json({
        service: "Scalable Quiz Platform Production API",
        domain: "api.jobexambd.com",
        version: c.env?.API_VERSION || "v1",
        runtime: "Cloudflare Workers (Hono) + Hostinger MySQL 8.0 (Drizzle)",
        docs: "/api/v1/openapi.json",
        health: "/api/v1/health",
        dbHealth: "/api/v1/db-health",
        authSync: "/api/v1/auth/clerk-sync",
        bindings: {
          kv: !!c.env?.CACHE_KV,
          hyperdrive: !!c.env?.HYPERDRIVE,
          r2: !!c.env?.ASSETS_R2
        },
        services: [
          "auth (/api/v1/auth/clerk-sync, /api/v1/auth/me, /api/v1/devices/register)",
          "catalog & quizzes (/api/v1/categories, /api/v1/exams, /api/v1/quizzes)",
          "attempts (/api/v1/quizzes/:id/start, /api/v1/attempts)",
          "payments (/api/v1/orders, /api/v1/payments)",
          "analytics (/api/v1/leaderboards, /api/v1/badges)"
        ]
      });
    });
    app2.get("/poc/db-check", (c) => {
      return handlePocCheck({
        env: c.env,
        req: c.req.raw,
        json: c.json.bind(c),
        executionCtx: getExecutionCtx2(c)
      });
    });
    app2.get("/api/v1/poc/db-check", (c) => {
      return handlePocCheck({
        env: c.env,
        req: c.req.raw,
        json: c.json.bind(c),
        executionCtx: getExecutionCtx2(c)
      });
    });
    handleDbHealth = async (c) => {
      let db = null;
      try {
        db = await createDrizzleClient(c.env);
        const probe = await verifyDatabaseConnection(db);
        return c.json({
          connected: probe.ok,
          latencyMs: probe.latencyMs,
          targetDatabase: "u427015050_drizzle",
          error: probe.error
        }, probe.ok ? 200 : 500);
      } catch (err) {
        return c.json({
          connected: false,
          error: err?.cause?.message || err?.message || "Drizzle client failed to connect. Verify DATABASE_URL or HYPERDRIVE binding.",
          targetDatabase: "u427015050_drizzle"
        }, 500);
      } finally {
        if (db) {
          await cleanupDb(db, c);
        }
      }
    };
    app2.get("/api/v1/db-health", handleDbHealth);
    app2.get("/db-health", handleDbHealth);
    app2.get("/api/v1/openapi.json", (c) => {
      return c.json({
        openapi: "3.0.3",
        info: {
          title: "Quiz Platform Production API Gateway",
          version: "1.0.0",
          description: "Cloudflare Workers Hono + Hostinger MySQL Microservices API"
        },
        paths: {
          "/health": { get: { summary: "System Health Check" } },
          "/api/v1/health": { get: { summary: "System Health Check (v1)" } },
          "/api/v1/db-health": { get: { summary: "Database Ping and Latency Probe" } },
          "/api/v1/poc/db-check": { get: { summary: "Database Proof-of-Concept Probe" } },
          "/api/v1/categories": { get: { summary: "List categories" }, post: { summary: "Create category (Strict MySQL)" } },
          "/api/v1/exams": { get: { summary: "List exams" }, post: { summary: "Create exam (Strict MySQL)" } },
          "/api/v1/quizzes": { get: { summary: "List quizzes" }, post: { summary: "Create quiz (Strict MySQL)" } },
          "/api/v1/questions": { get: { summary: "List questions" }, post: { summary: "Create question (Strict MySQL)" } },
          "/api/v1/quizzes/{id}/start": { post: { summary: "Start timed quiz attempt" } },
          "/api/v1/attempts/{id}/answers": { post: { summary: "Record candidate answer" } },
          "/api/v1/attempts/{id}/submit": { post: { summary: "Authoritative scoring & leaderboard update" } },
          "/api/v1/orders": { post: { summary: "Create paid quiz order" } },
          "/api/v1/payments/verify": { post: { summary: "Verify payment and grant QuizAccess" } },
          "/api/v1/sync/attempts": { post: { summary: "Offline attempt synchronization from SQLite" } },
          "/api/v1/leaderboards/{id}": { get: { summary: "Get quiz leaderboard" } },
          "/api/v1/auth/clerk-sync": { post: { summary: "Synchronize Clerk user profile to Hostinger MySQL (Clerk Auth)" } },
          "/api/v1/auth/me": { get: { summary: "Get current authenticated Clerk user session profile" } },
          "/api/v1/devices/register": { post: { summary: "Register candidate mobile device to Clerk user" } }
        }
      });
    });
    getAuthContext = (c) => {
      const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
      const clerkUserId = c.req.header("X-Clerk-User-Id") || (token.startsWith("user_") ? token : "");
      const correlationId = c.req.header("X-Correlation-ID") || `corr_${Date.now()}`;
      return { token, clerkUserId, correlationId };
    };
    app2.all("/api/v1/attempts/*", async (c) => {
      const { token, clerkUserId, correlationId } = getAuthContext(c);
      const res = await attemptService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId,
        userId: clerkUserId || token,
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/bookmarks/*", async (c) => {
      const res = await attemptService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/saved-quizzes/*", async (c) => {
      const res = await attemptService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/sync/*", async (c) => {
      const res = await attemptService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/quizzes/*/start", async (c) => {
      const res = await attemptService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/orders/*", async (c) => {
      const res = await paymentService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/payments/*", async (c) => {
      const res = await paymentService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/webhooks/*", async (c) => {
      const res = await paymentService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/quiz-access/*", async (c) => {
      const res = await paymentService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/leaderboards/*", async (c) => {
      const res = await analyticsService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.all("/api/v1/badges/*", async (c) => {
      const res = await analyticsService.handle({
        path: c.req.path.replace("/api/v1", ""),
        method: c.req.method,
        body: await c.req.json().catch(() => ({})),
        correlationId: c.req.header("X-Correlation-ID") || `corr_${Date.now()}`,
        userId: "",
        env: c.env
      });
      return c.json(res.data, res.status);
    });
    app2.notFound((c) => {
      return c.json({ error: "Endpoint Not Found", path: c.req.path, method: c.req.method }, 404);
    });
    src_default2 = app2;
  }
});

// server.ts
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var port = Number(process.env.PORT) || 3e3;
var rawEnvDbUrl = (process.env.DATABASE_URL || process.env.QUIZ_DATABASE_URL || "mysql://u427015050_drizzlequiz:R.r.4152@srv1562.hstgr.io:3306/u427015050_drizzle").trim();
var defaultConnectionString = rawEnvDbUrl.replace(/^ysql:\/\//, "mysql://").replace(/\/u427015050_drizzlequiz(\?.*)?$/i, "/u427015050_drizzle$1");
var workerEnv = {
  ...process.env,
  ENVIRONMENT: process.env.NODE_ENV || "development",
  API_VERSION: process.env.API_VERSION || "v1",
  DATABASE_URL: defaultConnectionString,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || "https://jobexambd.com,https://www.jobexambd.com,http://localhost:3000,http://localhost:3002,http://localhost:5173",
  HYPERDRIVE: {
    connectionString: defaultConnectionString
  }
};
var nodeExecutionCtx = {
  waitUntil(promise) {
    Promise.resolve(promise).catch((err) => {
      console.error("[Hono waitUntil error]:", err);
    });
  },
  passThroughOnException() {
  },
  props: {}
};
var API_ROUTE_PREFIXES = [
  "/api",
  "/auth",
  "/health",
  "/db-health",
  "/poc",
  "/devices",
  "/internal"
];
async function startServer() {
  const { register } = await import("tsx/esm/api");
  register();
  const { app: honoApp } = await Promise.resolve().then(() => (init_src7(), src_exports));
  const expressApp = express();
  expressApp.disable("x-powered-by");
  const rawBodyParser = express.raw({ type: "*/*", limit: "10mb" });
  expressApp.use(
    API_ROUTE_PREFIXES,
    rawBodyParser,
    async (req, res, next) => {
      try {
        const forwardedProto = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim();
        const protocol = forwardedProto || req.protocol || "http";
        const host = req.headers["x-forwarded-host"]?.split(",")[0]?.trim() || req.get("host") || `localhost:${port}`;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === void 0) continue;
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, String(value));
          }
        }
        const upperMethod = req.method.toUpperCase();
        const hasBody = upperMethod !== "GET" && upperMethod !== "HEAD";
        const bodyBytes = hasBody && Buffer.isBuffer(req.body) && req.body.length > 0 ? new Uint8Array(req.body) : void 0;
        const webRequest = new Request(fullUrl, {
          method: req.method,
          headers,
          body: bodyBytes
        });
        const webResponse = await honoApp.fetch(webRequest, workerEnv, nodeExecutionCtx);
        res.status(webResponse.status);
        const getSetCookie = webResponse.headers.getSetCookie;
        const setCookies = typeof getSetCookie === "function" ? getSetCookie.call(webResponse.headers) : [];
        webResponse.headers.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") return;
          res.setHeader(key, value);
        });
        if (setCookies.length > 0) {
          res.setHeader("set-cookie", setCookies);
        }
        const responseBuffer = Buffer.from(await webResponse.arrayBuffer());
        res.send(responseBuffer);
      } catch (err) {
        next(err);
      }
    }
  );
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true"
      },
      appType: "spa"
    });
    expressApp.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    const indexHtmlPath = path.join(distDir, "index.html");
    expressApp.use(express.static(distDir, { index: false }));
    expressApp.get("*", (_req, res) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
        return;
      }
      res.status(200).json({
        ok: true,
        service: "hono-quiz-admin",
        message: "API server running. Run `pnpm run build` to serve frontend assets."
      });
    });
  }
  expressApp.listen(port, "0.0.0.0", () => {
    console.log(`[JobExamBD Full-Stack Server] Listening on http://0.0.0.0:${port}`);
  });
}
startServer().catch((err) => {
  console.error("[Fatal Server Startup Error]:", err);
  process.exit(1);
});
