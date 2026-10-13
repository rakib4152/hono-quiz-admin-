import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  primaryKey,
  uniqueIndex,
  boolean,
  double,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/**
 * Users Table
 */
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    name: varchar('name', { length: 191 }),
    email: varchar('email', { length: 191 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    role: varchar('role', { length: 20 }).default('USER').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('email_idx').on(table.email),
  ]
);

/**
 * Categories Table
 */
export const categories = mysqlTable(
  'categories',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    name: varchar('name', { length: 191 }).notNull(),
    slug: varchar('slug', { length: 191 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('cat_slug_idx').on(table.slug),
  ]
);

/**
 * Exams Table
 */
export const exams = mysqlTable(
  'exams',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    categoryId: varchar('category_id', { length: 30 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    slug: varchar('slug', { length: 191 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('cat_exam_slug_idx').on(table.categoryId, table.slug),
  ]
);

/**
 * Subjects Table
 */
export const subjects = mysqlTable('subjects', {
  id: varchar('id', { length: 30 }).primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  slug: varchar('slug', { length: 191 }).notNull().unique(),
});

/**
 * Topics Table
 */
export const topics = mysqlTable(
  'topics',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    subjectId: varchar('subject_id', { length: 30 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    slug: varchar('slug', { length: 191 }).notNull(),
  },
  (table) => [
    uniqueIndex('sub_topic_slug_idx').on(table.subjectId, table.slug),
  ]
);

/**
 * Quizzes Table
 */
export const quizzes = mysqlTable(
  'quizzes',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    examId: varchar('exam_id', { length: 30 }).notNull(),
    title: varchar('title', { length: 191 }).notNull(),
    slug: varchar('slug', { length: 191 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).default('DRAFT').notNull(),
    price: int('price').default(0).notNull(),
    currency: varchar('currency', { length: 3 }).default('BDT').notNull(),
    durationSeconds: int('duration_seconds'),
    passPercentage: double('pass_percentage'),
    shuffleQuestions: boolean('shuffle_questions').default(false).notNull(),
    shuffleOptions: boolean('shuffle_options').default(false).notNull(),
    negativeMark: double('negative_mark').default(0).notNull(),
    maxAttempts: int('max_attempts'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('exam_quiz_slug_idx').on(table.examId, table.slug),
  ]
);

/**
 * Questions Table
 */
export const questions = mysqlTable('questions', {
  id: varchar('id', { length: 30 }).primaryKey(),
  subjectId: varchar('subject_id', { length: 30 }).notNull(),
  topicId: varchar('topic_id', { length: 30 }),
  body: text('body').notNull(),
  explanation: text('explanation'),
  difficulty: int('difficulty').default(1).notNull(),
  marks: double('marks').default(1).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Options Table
 */
export const options = mysqlTable('options', {
  id: varchar('id', { length: 30 }).primaryKey(),
  questionId: varchar('question_id', { length: 30 }).notNull(),
  text: text('text').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  isCorrect: boolean('is_correct').default(false).notNull(),
  position: int('position').notNull(),
});

/**
 * Quiz Questions Join Table
 */
export const quizQuestions = mysqlTable(
  'quiz_questions',
  {
    quizId: varchar('quiz_id', { length: 30 }).notNull(),
    questionId: varchar('question_id', { length: 30 }).notNull(),
    position: int('position').notNull(),
    marks: double('marks'),
  },
  (table) => [
    primaryKey({ columns: [table.quizId, table.questionId] }),
  ]
);

/**
 * Attempts Table
 */
export const attempts = mysqlTable(
  'attempts',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    userId: varchar('user_id', { length: 30 }).notNull(),
    quizId: varchar('quiz_id', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).default('IN_PROGRESS').notNull(),
    requestId: varchar('request_id', { length: 191 }).unique(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    submittedAt: timestamp('submitted_at'),
    expiresAt: timestamp('expires_at'),
    totalQuestions: int('total_questions').notNull(),
    correctCount: int('correct_count').default(0).notNull(),
    wrongCount: int('wrong_count').default(0).notNull(),
    unansweredCount: int('unanswered_count').default(0).notNull(),
    score: double('score').default(0).notNull(),
    maxScore: double('max_score').default(0).notNull(),
    percentage: double('percentage').default(0).notNull(),
    timeTakenSeconds: int('time_taken_seconds'),
  },
  (table) => [
    uniqueIndex('attempt_req_idx').on(table.requestId),
  ]
);

/**
 * Attempt Answers Table
 */
export const attemptAnswers = mysqlTable('attempt_answers', {
  id: varchar('id', { length: 30 }).primaryKey(),
  attemptId: varchar('attempt_id', { length: 30 }).notNull(),
  questionId: varchar('question_id', { length: 30 }).notNull(),
  selectedOptionId: varchar('selected_option_id', { length: 30 }),
  isCorrect: boolean('is_correct'),
  marksAwarded: double('marks_awarded').default(0).notNull(),
  timeTakenSeconds: int('time_taken_seconds'),
  answeredAt: timestamp('answered_at').defaultNow().notNull(),
});

/**
 * Bookmarks Table
 */
export const bookmarks = mysqlTable(
  'bookmarks',
  {
    userId: varchar('user_id', { length: 30 }).notNull(),
    questionId: varchar('question_id', { length: 30 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.questionId] }),
  ]
);

/**
 * Quiz Access Table
 */
export const quizAccess = mysqlTable(
  'quiz_access',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    userId: varchar('user_id', { length: 30 }).notNull(),
    quizId: varchar('quiz_id', { length: 30 }).notNull(),
    orderId: varchar('order_id', { length: 30 }),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    uniqueIndex('user_quiz_access_idx').on(table.userId, table.quizId),
  ]
);

/**
 * Orders Table
 */
export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 30 }).primaryKey(),
  userId: varchar('user_id', { length: 30 }).notNull(),
  quizId: varchar('quiz_id', { length: 30 }).notNull(),
  amount: int('amount').notNull(),
  currency: varchar('currency', { length: 3 }).default('BDT').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 191 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
});

/**
 * Payments Table
 */
export const payments = mysqlTable('payments', {
  id: varchar('id', { length: 30 }).primaryKey(),
  orderId: varchar('order_id', { length: 30 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerReference: varchar('provider_reference', { length: 191 }).unique(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  amount: int('amount').notNull(),
  currency: varchar('currency', { length: 3 }).default('BDT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  exams: many(exams),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  category: one(categories, {
    fields: [exams.categoryId],
    references: [categories.id],
  }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  exam: one(exams, {
    fields: [quizzes.examId],
    references: [exams.id],
  }),
  quizQuestions: many(quizQuestions),
  attempts: many(attempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [questions.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
  }),
  options: many(options),
  quizQuestions: many(quizQuestions),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));
