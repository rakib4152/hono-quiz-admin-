import { z } from 'zod';

export const QuestionOptionSchema = z.object({
  id: z.string(),
  textEn: z.string().min(1, 'Option text in English is required'),
  textBn: z.string().min(1, 'বাংলা অপশন টেক্সট দেওয়া আবশ্যক'),
  isCorrect: z.boolean().default(false),
});

export const QuestionFormSchema = z.object({
  code: z.string().min(2, 'Question code must be at least 2 characters (e.g. BCS-46-M-01)'),
  type: z.enum(['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE']),
  titleEn: z.string().min(5, 'English question text must be at least 5 characters'),
  titleBn: z.string().min(5, 'বাংলা প্রশ্ন কমপক্ষে ৫ অক্ষরের হতে হবে'),
  categoryId: z.string().min(1, 'Please select a Category'),
  examId: z.string().min(1, 'Please select an Exam'),
  subjectId: z.string().min(1, 'Please select a Subject'),
  topicId: z.string().min(1, 'Please select a Topic'),
  chapterId: z.string().min(1, 'Please select a Chapter'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  positiveMarks: z.coerce.number().positive('Positive marks must be greater than 0'),
  negativeMarks: z.coerce.number().min(0, 'Negative marks cannot be negative'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  options: z
    .array(QuestionOptionSchema)
    .min(2, 'At least 2 options are required')
    .refine((opts) => opts.some((o) => o.isCorrect), {
      message: 'At least one option must be marked as correct',
    }),
  explanationEn: z.string().optional(),
  explanationBn: z.string().optional(),
  tags: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export type QuestionFormValues = z.infer<typeof QuestionFormSchema>;
