import { z } from 'zod';

/**
 * Question Option Input Schema
 */
export const OptionInputSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Option text is required'),
  is_correct: z.boolean().default(false),
  image_url: z.string().url('Invalid image URL').optional().nullable().or(z.literal('')),
  position: z.number().int().optional(),
});

/**
 * Question Type Enum
 */
export const QuestionTypeEnum = z.enum(['single_choice', 'multiple_choice', 'true_false']);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

/**
 * Base Question Validator
 */
export const QuestionInputSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().min(1, 'Question text (body) is required'),
    type: QuestionTypeEnum.default('single_choice'),
    explanation: z.string().optional().nullable(),
    marks: z.coerce.number().positive('Marks must be greater than 0').default(1.0),
    order: z.coerce.number().int().min(1).optional(),
    position: z.coerce.number().int().min(1).optional(),
    image: z.string().url('Invalid image URL').optional().nullable().or(z.literal('')),
    image_url: z.string().url('Invalid image URL').optional().nullable().or(z.literal('')),
    subject_id: z.string().optional().nullable(),
    topic_id: z.string().optional().nullable(),
    options: z.array(OptionInputSchema).min(2, 'At least 2 options are required for every question'),
  })
  .superRefine((data, ctx) => {
    const correctCount = data.options.filter((o) => o.is_correct).length;

    if (data.type === 'single_choice') {
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Single choice questions must have exactly one correct option. Found: ${correctCount}.`,
          path: ['options'],
        });
      }
    } else if (data.type === 'true_false') {
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `True/False questions must have exactly one correct option. Found: ${correctCount}.`,
          path: ['options'],
        });
      }
      if (data.options.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `True/False questions must have exactly 2 options (e.g. True and False). Found: ${data.options.length}.`,
          path: ['options'],
        });
      }
    } else if (data.type === 'multiple_choice') {
      if (correctCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Multiple choice questions must have at least one correct option.',
          path: ['options'],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof QuestionInputSchema>;

/**
 * Bulk Questions Input Schema
 */
export const BulkQuestionsSchema = z.object({
  questions: z.array(QuestionInputSchema).min(1, 'At least one question is required for bulk creation'),
});

export type BulkQuestionsInput = z.infer<typeof BulkQuestionsSchema>;

/**
 * Question Reorder Schema
 */
export const QuestionReorderItemSchema = z.object({
  question_id: z.string().optional(),
  questionId: z.string().optional(),
  order: z.coerce.number().int().min(1).optional(),
  position: z.coerce.number().int().min(1).optional(),
}).refine(
  (item) => !!(item.question_id || item.questionId) && (item.order !== undefined || item.position !== undefined),
  { message: 'Each reorder item must specify question_id (or questionId) and order (or position)' }
);

export const QuestionReorderSchema = z.object({
  orders: z.array(QuestionReorderItemSchema).min(1, 'At least one question reorder item is required'),
});

export type QuestionReorderInput = z.infer<typeof QuestionReorderSchema>;

/**
 * Quiz Create Schema
 * Supports snake_case (requested) with camelCase fallbacks
 */
export const QuizCreateSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(191, 'Title cannot exceed 191 characters'),
  description: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  exam_id: z.string().min(1, 'exam_id is required').optional(),
  examId: z.string().min(1, 'examId is required').optional(),
  duration_minutes: z.coerce.number().positive('Duration must be greater than 0').optional().nullable(),
  durationMinutes: z.coerce.number().positive('Duration must be greater than 0').optional().nullable(),
  passing_score: z.coerce.number().min(0, 'Passing score must be at least 0').max(100, 'Passing score cannot exceed 100').optional().nullable(),
  passingScore: z.coerce.number().min(0, 'Passing score must be at least 0').max(100, 'Passing score cannot exceed 100').optional().nullable(),
  is_free: z.boolean().optional().default(true),
  isFree: z.boolean().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional().default(0),
  currency: z.string().length(3).optional().default('BDT'),
  is_published: z.boolean().optional().default(false),
  isPublished: z.boolean().optional(),
  shuffle_questions: z.boolean().optional().default(false),
  shuffle_options: z.boolean().optional().default(false),
  negative_mark: z.coerce.number().min(0).optional().default(0),
}).refine(
  (data) => !!(data.exam_id || data.examId),
  { message: 'exam_id is required', path: ['exam_id'] }
);

export type QuizCreateInput = z.infer<typeof QuizCreateSchema>;

/**
 * Quiz Update Schema
 */
export const QuizUpdateSchema = z.object({
  title: z.string().min(1, 'Quiz title cannot be empty').max(191).optional(),
  description: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  exam_id: z.string().optional().nullable(),
  examId: z.string().optional().nullable(),
  duration_minutes: z.coerce.number().positive('Duration must be greater than 0').optional().nullable(),
  durationMinutes: z.coerce.number().positive('Duration must be greater than 0').optional().nullable(),
  passing_score: z.coerce.number().min(0).max(100).optional().nullable(),
  passingScore: z.coerce.number().min(0).max(100).optional().nullable(),
  is_free: z.boolean().optional(),
  isFree: z.boolean().optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  is_published: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  negative_mark: z.coerce.number().min(0).optional(),
});

export type QuizUpdateInput = z.infer<typeof QuizUpdateSchema>;

/**
 * Quiz Publish Schema
 */
export const QuizPublishSchema = z.object({
  is_published: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).optional(),
}).refine(
  (data) => data.is_published !== undefined || data.isPublished !== undefined || data.status !== undefined,
  { message: 'Please provide is_published (boolean) or status ("PUBLISHED" | "DRAFT")' }
);

export type QuizPublishInput = z.infer<typeof QuizPublishSchema>;

/**
 * Bulk Import Schema
 */
export const QuizImportSchema = z.object({
  quiz: QuizCreateSchema,
  questions: z.array(QuestionInputSchema).min(1, 'At least one question is required for bulk quiz import'),
});

export type QuizImportInput = z.infer<typeof QuizImportSchema>;

/**
 * Formats Zod errors into standard JSON API error format
 */
export function formatZodError(error: z.ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    message: details.map((d) => `${d.field}: ${d.message}`).join('; '),
    details,
  };
}
