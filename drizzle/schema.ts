import { mysqlTable, mysqlSchema, AnyMySqlColumn, unique, varchar, timestamp, int, double, text } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const attempts = mysqlTable("attempts", {
	id: varchar({ length: 30 }).notNull(),
	userId: varchar("user_id", { length: 30 }).notNull(),
	quizId: varchar("quiz_id", { length: 30 }).notNull(),
	status: varchar({ length: 20 }).default('\'IN_PROGRESS\'').notNull(),
	requestId: varchar("request_id", { length: 191 }).default('NULL'),
	startedAt: timestamp("started_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default('NULL'),
	expiresAt: timestamp("expires_at", { mode: 'string' }).default('NULL'),
	totalQuestions: int("total_questions").notNull(),
	correctCount: int("correct_count").default(0).notNull(),
	wrongCount: int("wrong_count").default(0).notNull(),
	unansweredCount: int("unanswered_count").default(0).notNull(),
	score: double().notNull(),
	maxScore: double("max_score").notNull(),
	percentage: double().notNull(),
	timeTakenSeconds: int("time_taken_seconds").default('NULL'),
},
(table) => [
	unique("attempts_request_id_unique").on(table.requestId),
	unique("attempt_req_idx").on(table.requestId),
]);

export const attemptAnswers = mysqlTable("attempt_answers", {
	id: varchar({ length: 30 }).notNull(),
	attemptId: varchar("attempt_id", { length: 30 }).notNull(),
	questionId: varchar("question_id", { length: 30 }).notNull(),
	selectedOptionId: varchar("selected_option_id", { length: 30 }).default('NULL'),
	isCorrect: tinyint("is_correct").default('NULL'),
	marksAwarded: double("marks_awarded").notNull(),
	timeTakenSeconds: int("time_taken_seconds").default('NULL'),
	answeredAt: timestamp("answered_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const bookmarks = mysqlTable("bookmarks", {
	userId: varchar("user_id", { length: 30 }).notNull(),
	questionId: varchar("question_id", { length: 30 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const categories = mysqlTable("categories", {
	id: varchar({ length: 30 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	slug: varchar({ length: 191 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("categories_slug_unique").on(table.slug),
	unique("cat_slug_idx").on(table.slug),
]);

export const exams = mysqlTable("exams", {
	id: varchar({ length: 30 }).notNull(),
	categoryId: varchar("category_id", { length: 30 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	slug: varchar({ length: 191 }).notNull(),
	description: text().default('NULL'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("cat_exam_slug_idx").on(table.categoryId, table.slug),
]);

export const options = mysqlTable("options", {
	id: varchar({ length: 30 }).notNull(),
	questionId: varchar("question_id", { length: 30 }).notNull(),
	text: text().notNull(),
	imageUrl: varchar("image_url", { length: 500 }).default('NULL'),
	isCorrect: tinyint("is_correct").default(0).notNull(),
	position: int().notNull(),
});

export const orders = mysqlTable("orders", {
	id: varchar({ length: 30 }).notNull(),
	userId: varchar("user_id", { length: 30 }).notNull(),
	quizId: varchar("quiz_id", { length: 30 }).notNull(),
	amount: int().notNull(),
	currency: varchar({ length: 3 }).default('\'BDT\'').notNull(),
	status: varchar({ length: 20 }).default('\'PENDING\'').notNull(),
	idempotencyKey: varchar("idempotency_key", { length: 191 }).default('NULL'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }).default('NULL'),
},
(table) => [
	unique("orders_idempotency_key_unique").on(table.idempotencyKey),
]);

export const payments = mysqlTable("payments", {
	id: varchar({ length: 30 }).notNull(),
	orderId: varchar("order_id", { length: 30 }).notNull(),
	provider: varchar({ length: 50 }).notNull(),
	providerReference: varchar("provider_reference", { length: 191 }).default('NULL'),
	status: varchar({ length: 20 }).default('\'PENDING\'').notNull(),
	amount: int().notNull(),
	currency: varchar({ length: 3 }).default('\'BDT\'').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }).default('NULL'),
},
(table) => [
	unique("payments_provider_reference_unique").on(table.providerReference),
]);

export const questions = mysqlTable("questions", {
	id: varchar({ length: 30 }).notNull(),
	subjectId: varchar("subject_id", { length: 30 }).notNull(),
	topicId: varchar("topic_id", { length: 30 }).default('NULL'),
	body: text().notNull(),
	explanation: text().default('NULL'),
	difficulty: int().default(1).notNull(),
	marks: double().default(1).notNull(),
	imageUrl: varchar("image_url", { length: 500 }).default('NULL'),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const quizzes = mysqlTable("quizzes", {
	id: varchar({ length: 30 }).notNull(),
	examId: varchar("exam_id", { length: 30 }).notNull(),
	title: varchar({ length: 191 }).notNull(),
	slug: varchar({ length: 191 }).notNull(),
	description: text().default('NULL'),
	status: varchar({ length: 20 }).default('\'DRAFT\'').notNull(),
	price: int().default(0).notNull(),
	currency: varchar({ length: 3 }).default('\'BDT\'').notNull(),
	durationSeconds: int("duration_seconds").default('NULL'),
	passPercentage: double("pass_percentage").default('NULL'),
	shuffleQuestions: tinyint("shuffle_questions").default(0).notNull(),
	shuffleOptions: tinyint("shuffle_options").default(0).notNull(),
	negativeMark: double("negative_mark").notNull(),
	maxAttempts: int("max_attempts").default('NULL'),
	publishedAt: timestamp("published_at", { mode: 'string' }).default('NULL'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("exam_quiz_slug_idx").on(table.examId, table.slug),
]);

export const quizAccess = mysqlTable("quiz_access", {
	id: varchar({ length: 30 }).notNull(),
	userId: varchar("user_id", { length: 30 }).notNull(),
	quizId: varchar("quiz_id", { length: 30 }).notNull(),
	orderId: varchar("order_id", { length: 30 }).default('NULL'),
	grantedAt: timestamp("granted_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).default('NULL'),
},
(table) => [
	unique("user_quiz_access_idx").on(table.userId, table.quizId),
]);

export const quizQuestions = mysqlTable("quiz_questions", {
	quizId: varchar("quiz_id", { length: 30 }).notNull(),
	questionId: varchar("question_id", { length: 30 }).notNull(),
	position: int().notNull(),
	marks: double().default('NULL'),
});

export const subjects = mysqlTable("subjects", {
	id: varchar({ length: 30 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	slug: varchar({ length: 191 }).notNull(),
},
(table) => [
	unique("subjects_slug_unique").on(table.slug),
]);

export const topics = mysqlTable("topics", {
	id: varchar({ length: 30 }).notNull(),
	subjectId: varchar("subject_id", { length: 30 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	slug: varchar({ length: 191 }).notNull(),
},
(table) => [
	unique("sub_topic_slug_idx").on(table.subjectId, table.slug),
]);

export const users = mysqlTable("users", {
	id: varchar({ length: 30 }).notNull(),
	name: varchar({ length: 191 }).default('NULL'),
	email: varchar({ length: 191 }).default('NULL'),
	passwordHash: varchar("password_hash", { length: 255 }).default('NULL'),
	role: varchar({ length: 20 }).default('\'USER\'').notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("users_email_unique").on(table.email),
	unique("email_idx").on(table.email),
]);
