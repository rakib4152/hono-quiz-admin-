/**
 * Centralized API Client for Next.js Admin calling Cloudflare Workers Hono API
 * API Base URL: /api/v1 (or Cloudflare Worker Production domain)
 */

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuestionDTO {
  id: string;
  code: string;
  type: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE';
  titleEn: string;
  titleBn: string;
  categoryId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  chapterId: string;
  categoryName?: string;
  subjectName?: string;
  topicName?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  positiveMarks: number;
  negativeMarks: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  options: {
    id: string;
    textEn: string;
    textBn: string;
    isCorrect: boolean;
  }[];
  explanationEn?: string;
  explanationBn?: string;
  tags: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  description?: string;
  examsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface ExamDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  nameEn: string;
  nameBn: string;
  code: string;
  slug?: string;
  totalMarks?: number;
  durationMinutes?: number;
  quizzesCount: number;
  subjectsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface SubjectDTO {
  id: string;
  examId: string;
  examName: string;
  nameEn: string;
  nameBn: string;
  code: string;
  slug?: string;
  marksWeightage: number;
  topicsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface TopicDTO {
  id: string;
  subjectId: string;
  subjectName: string;
  nameEn: string;
  nameBn: string;
  code: string;
  slug?: string;
  chaptersCount: number;
  questionsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface ChapterDTO {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  nameEn: string;
  nameBn: string;
  code: string;
  slug?: string;
  questionsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface QuizDTO {
  id: string;
  titleEn: string;
  titleBn: string;
  slug: string;
  examId: string;
  examName: string;
  totalMarks: number;
  passMarks: number;
  durationMinutes: number;
  totalQuestions: number;
  isPaid: boolean;
  priceBdt: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
}

export interface UserDTO {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EXAMINER' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt: string;
  quizzesTaken: number;
  totalSpendBdt: number;
}

export interface AttemptDTO {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userEmail: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ABANDONED';
  startedAt: string;
  submittedAt?: string;
  timeTakenSeconds: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
}

export interface OrderPaymentDTO {
  id: string;
  orderNumber: string;
  userEmail: string;
  amountBdt: number;
  gateway: 'SSLCOMMERZ' | 'AAMARPAY' | 'MANUAL';
  transactionId: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

// Initial mock dataset loaded into reactive state for full browser fidelity
export const initialQuestions: QuestionDTO[] = [
  {
    id: 'q-101',
    code: 'BCS-46-MATH-01',
    type: 'MCQ_SINGLE',
    titleEn: 'If x + y = 7 and xy = 10, what is the value of (x - y)^2?',
    titleBn: 'যদি x + y = 7 এবং xy = 10 হয়, তবে (x - y)^2 এর মান কত?',
    categoryId: 'cat-1',
    categoryName: 'Job Preparation',
    examId: 'exam-1',
    subjectId: 'sub-1',
    subjectName: 'Mathematics',
    topicId: 'top-1',
    topicName: 'Algebra',
    chapterId: 'chap-1',
    difficulty: 'MEDIUM',
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    status: 'PUBLISHED',
    options: [
      { id: 'opt-1', textEn: '9', textBn: '৯', isCorrect: true },
      { id: 'opt-2', textEn: '14', textBn: '১৪', isCorrect: false },
      { id: 'opt-3', textEn: '29', textBn: '২৯', isCorrect: false },
      { id: 'opt-4', textEn: '49', textBn: '৪৯', isCorrect: false },
    ],
    explanationEn: '(x - y)^2 = (x + y)^2 - 4xy = 7^2 - 4(10) = 49 - 40 = 9.',
    explanationBn: '(x - y)^2 = (x + y)^2 - 4xy = 7^2 - 4(10) = 49 - 40 = 9। অতএব উত্তর ৯।',
    tags: ['BCS', 'Algebra', 'Formulas'],
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'q-102',
    code: 'BCS-46-BAN-01',
    type: 'MCQ_SINGLE',
    titleEn: 'Who is the author of "Charyapada"?',
    titleBn: '"চর্যাপদ" এর প্রাচীনতম পদকর্তা কে?',
    categoryId: 'cat-1',
    categoryName: 'Job Preparation',
    examId: 'exam-1',
    subjectId: 'sub-2',
    subjectName: 'Bangla Literature',
    topicId: 'top-2',
    topicName: 'Ancient Period',
    chapterId: 'chap-2',
    difficulty: 'EASY',
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    status: 'PUBLISHED',
    options: [
      { id: 'opt-5', textEn: 'Luipa', textBn: 'লুইপা', isCorrect: true },
      { id: 'opt-6', textEn: 'Kanhapa', textBn: 'কাহ্নপা', isCorrect: false },
      { id: 'opt-7', textEn: 'Bhusukupa', textBn: 'ভুসুকুপা', isCorrect: false },
      { id: 'opt-8', textEn: 'Shabarpa', textBn: 'শবরপা', isCorrect: false },
    ],
    explanationEn: 'Luipa is recognized as the earliest composer of Charyapada with the opening verse.',
    explanationBn: 'চর্যাপদের প্রথম পদটির রচয়িতা লুইপা, তিনি প্রাচীনতম পদকর্তা হিসেবে স্বীকৃত।',
    tags: ['BCS', 'Bangla Literature', 'Ancient Era'],
    createdAt: '2026-03-16T11:20:00Z',
    updatedAt: '2026-03-16T11:20:00Z',
  },
  {
    id: 'q-103',
    code: 'MED-26-BIO-01',
    type: 'MCQ_SINGLE',
    titleEn: 'Which cell organelle is known as the powerhouse of the cell?',
    titleBn: 'কোন কোষীয় অঙ্গাণুকে কোষের পাওয়ার হাউস (শক্তিঘর) বলা হয়?',
    categoryId: 'cat-2',
    categoryName: 'Medical Admission',
    examId: 'exam-2',
    subjectId: 'sub-3',
    subjectName: 'Biology',
    topicId: 'top-3',
    topicName: 'Cell Biology',
    chapterId: 'chap-3',
    difficulty: 'EASY',
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    status: 'PUBLISHED',
    options: [
      { id: 'opt-9', textEn: 'Mitochondria', textBn: 'মাইটোকন্ড্রিয়া', isCorrect: true },
      { id: 'opt-10', textEn: 'Ribosome', textBn: 'রাইবোজোম', isCorrect: false },
      { id: 'opt-11', textEn: 'Golgi Apparatus', textBn: 'গলগি বডি', isCorrect: false },
      { id: 'opt-12', textEn: 'Nucleus', textBn: 'নিউক্লিয়াস', isCorrect: false },
    ],
    explanationEn: 'Mitochondria generates most of the chemical energy needed by cell through ATP.',
    explanationBn: 'মাইটোকন্ড্রিয়াতে ক্রেবস চক্র ও এটিপি উৎপাদিত হয় বলে একে কোষের শক্তিকেন্দ্র বা পাওয়ার হাউস বলে।',
    tags: ['Medical', 'Cell', 'Biology'],
    createdAt: '2026-03-18T09:15:00Z',
    updatedAt: '2026-03-18T09:15:00Z',
  },
];

export const initialCategories: CategoryDTO[] = [
  {
    id: 'cat-1',
    nameEn: 'Job Preparation',
    nameBn: 'সরকারি ও ব্যাংক চাকরি প্রস্তুতি',
    slug: 'job-preparation',
    description: 'Civil service BCS, government bank officer, and ministry recruitment tests',
    examsCount: 8,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    nameEn: 'Medical Admission',
    nameBn: 'মেডিকেল ও ডেন্টাল ভর্তি প্রস্তুতি',
    slug: 'medical-admission',
    description: 'MBBS, BDS, and Armed Forces Medical College entrance tests',
    examsCount: 4,
    status: 'ACTIVE',
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'cat-3',
    nameEn: 'University Admission',
    nameBn: 'পাবলিক বিশ্ববিদ্যালয় ভর্তি পরীক্ষা',
    slug: 'university-admission',
    description: 'Dhaka University Ka/Kha/Ga, GST cluster, and RU/CU admission units',
    examsCount: 12,
    status: 'ACTIVE',
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'cat-4',
    nameEn: 'Engineering Admission',
    nameBn: 'প্রকৌশল ভর্তি পরীক্ষা (বুয়েট/কুয়েট/রুয়েট)',
    slug: 'engineering-admission',
    description: 'BUET, CKRUET cluster, and MIST entrance examinations',
    examsCount: 3,
    status: 'ACTIVE',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cat-5',
    nameEn: 'Primary & NTRCA Teachers',
    nameBn: 'প্রাথমিক শিক্ষক ও শিক্ষক নিবন্ধন (NTRCA)',
    slug: 'teachers-recruitment',
    description: 'Government Primary School Assistant Teacher and NTRCA 18th/19th exams',
    examsCount: 6,
    status: 'ACTIVE',
    createdAt: '2026-02-01T00:00:00Z',
  },
];

export const initialExams: ExamDTO[] = [
  {
    id: 'exam-1',
    categoryId: 'cat-1',
    categoryName: 'Job Preparation',
    nameEn: '46th BCS Preliminary',
    nameBn: '৪৬তম বিসিএস প্রিলিমিনারি পরীক্ষা',
    code: 'BCS-46-PRE',
    totalMarks: 200,
    durationMinutes: 120,
    quizzesCount: 24,
    subjectsCount: 10,
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'exam-2',
    categoryId: 'cat-1',
    categoryName: 'Job Preparation',
    nameEn: 'Combined 8 Banks Officer Cash',
    nameBn: 'সমন্বিত ৮ ব্যাংক অফিসার ক্যাশ পরীক্ষা',
    code: 'BANK-8-CASH',
    totalMarks: 100,
    durationMinutes: 60,
    quizzesCount: 16,
    subjectsCount: 5,
    status: 'ACTIVE',
    createdAt: '2026-01-08T00:00:00Z',
  },
  {
    id: 'exam-3',
    categoryId: 'cat-2',
    categoryName: 'Medical Admission',
    nameEn: 'Medical MBBS Admission 2026',
    nameBn: 'মেডিকেল এমবিবিএস ভর্তি পরীক্ষা ২০২৬',
    code: 'MED-MBBS-2026',
    totalMarks: 100,
    durationMinutes: 60,
    quizzesCount: 30,
    subjectsCount: 5,
    status: 'ACTIVE',
    createdAt: '2026-01-12T00:00:00Z',
  },
  {
    id: 'exam-4',
    categoryId: 'cat-3',
    categoryName: 'University Admission',
    nameEn: 'Dhaka University Ka Unit (Science)',
    nameBn: 'ঢাকা বিশ্ববিদ্যালয় ক ইউনিট ভর্তি পরীক্ষা',
    code: 'DU-KA-2026',
    totalMarks: 100,
    durationMinutes: 90,
    quizzesCount: 18,
    subjectsCount: 4,
    status: 'ACTIVE',
    createdAt: '2026-01-20T00:00:00Z',
  },
  {
    id: 'exam-5',
    categoryId: 'cat-4',
    categoryName: 'Engineering Admission',
    nameEn: 'BUET Preliminary Screening Test',
    nameBn: 'বুয়েট প্রাক-নির্বাচনী পরীক্ষা',
    code: 'BUET-PRE-2026',
    totalMarks: 100,
    durationMinutes: 60,
    quizzesCount: 12,
    subjectsCount: 3,
    status: 'ACTIVE',
    createdAt: '2026-01-25T00:00:00Z',
  },
];

export const initialSubjects: SubjectDTO[] = [
  {
    id: 'sub-1',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    nameEn: 'Mathematics & Mental Ability',
    nameBn: 'গাণিতিক যুক্তি ও মানসিক দক্ষতা',
    code: 'MATH-BCS',
    marksWeightage: 30,
    topicsCount: 12,
    status: 'ACTIVE',
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'sub-2',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    nameEn: 'Bangla Language & Literature',
    nameBn: 'বাংলা ভাষা ও সাহিত্য',
    code: 'BAN-BCS',
    marksWeightage: 35,
    topicsCount: 15,
    status: 'ACTIVE',
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'sub-3',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    nameEn: 'English Language & Literature',
    nameBn: 'ইংরেজি ভাষা ও সাহিত্য',
    code: 'ENG-BCS',
    marksWeightage: 35,
    topicsCount: 14,
    status: 'ACTIVE',
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'sub-4',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    nameEn: 'Bangladesh Affairs',
    nameBn: 'বাংলাদেশ বিষয়াবলি',
    code: 'BD-BCS',
    marksWeightage: 30,
    topicsCount: 18,
    status: 'ACTIVE',
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 'sub-5',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    nameEn: 'General Science & Technology',
    nameBn: 'সাধারণ বিজ্ঞান ও তথ্যপ্রযুক্তি',
    code: 'SCI-BCS',
    marksWeightage: 30,
    topicsCount: 16,
    status: 'ACTIVE',
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 'sub-6',
    examId: 'exam-3',
    examName: 'Medical MBBS Admission 2026',
    nameEn: 'Biology (Botany & Zoology)',
    nameBn: 'জীববিজ্ঞান (উদ্ভিদ ও প্রাণিবিজ্ঞান)',
    code: 'BIO-MED',
    marksWeightage: 30,
    topicsCount: 20,
    status: 'ACTIVE',
    createdAt: '2026-01-13T00:00:00Z',
  },
  {
    id: 'sub-7',
    examId: 'exam-3',
    examName: 'Medical MBBS Admission 2026',
    nameEn: 'Chemistry',
    nameBn: 'রসায়ন বিজ্ঞান',
    code: 'CHEM-MED',
    marksWeightage: 25,
    topicsCount: 16,
    status: 'ACTIVE',
    createdAt: '2026-01-13T00:00:00Z',
  },
];

export const initialTopics: TopicDTO[] = [
  {
    id: 'top-1',
    subjectId: 'sub-1',
    subjectName: 'Mathematics & Mental Ability',
    nameEn: 'Algebra & Equations',
    nameBn: 'বীজগণিতীয় রাশি ও সমীকরণ',
    code: 'TOP-ALG',
    chaptersCount: 5,
    questionsCount: 420,
    status: 'ACTIVE',
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'top-2',
    subjectId: 'sub-2',
    subjectName: 'Bangla Language & Literature',
    nameEn: 'Ancient & Medieval Era Literature',
    nameBn: 'প্রাচীন ও মধ্যযুগের সাহিত্য',
    code: 'TOP-BAN-ANC',
    chaptersCount: 4,
    questionsCount: 380,
    status: 'ACTIVE',
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'top-3',
    subjectId: 'sub-6',
    subjectName: 'Biology (Botany & Zoology)',
    nameEn: 'Cell Structure & Function',
    nameBn: 'কোষ ও এর গঠন',
    code: 'TOP-CELL',
    chaptersCount: 6,
    questionsCount: 510,
    status: 'ACTIVE',
    createdAt: '2026-01-14T00:00:00Z',
  },
  {
    id: 'top-4',
    subjectId: 'sub-3',
    subjectName: 'English Language & Literature',
    nameEn: 'Parts of Speech & Idioms',
    nameBn: 'পার্টস অব স্পিচ ও প্রবাদ প্রবচন',
    code: 'TOP-ENG-GRAM',
    chaptersCount: 8,
    questionsCount: 650,
    status: 'ACTIVE',
    createdAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 'top-5',
    subjectId: 'sub-4',
    subjectName: 'Bangladesh Affairs',
    nameEn: 'Liberation War & Constitution 1971',
    nameBn: 'মহান মুক্তিযুদ্ধ ও সংবিধান ১৯৭২',
    code: 'TOP-LIB-WAR',
    chaptersCount: 7,
    questionsCount: 720,
    status: 'ACTIVE',
    createdAt: '2026-01-07T00:00:00Z',
  },
];

export const initialChapters: ChapterDTO[] = [
  {
    id: 'chap-1',
    topicId: 'top-1',
    topicName: 'Algebra & Equations',
    subjectName: 'Mathematics',
    nameEn: 'Linear & Quadratic Equations',
    nameBn: 'একঘাত ও দ্বিঘাত সমীকরণ',
    code: 'CHAP-EQ-01',
    questionsCount: 140,
    status: 'ACTIVE',
    createdAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 'chap-2',
    topicId: 'top-2',
    topicName: 'Ancient & Medieval Era Literature',
    subjectName: 'Bangla Literature',
    nameEn: 'Charyapada & Mangalkavya',
    nameBn: 'চর্যাপদ ও মঙ্গলকাব্য',
    code: 'CHAP-CHAR-01',
    questionsCount: 190,
    status: 'ACTIVE',
    createdAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 'chap-3',
    topicId: 'top-3',
    topicName: 'Cell Structure & Function',
    subjectName: 'Biology',
    nameEn: 'Mitochondria, Nucleus & Cell Division',
    nameBn: 'মাইটোকন্ড্রিয়া, নিউক্লিয়াস ও কোষ বিভাজন',
    code: 'CHAP-CELL-01',
    questionsCount: 220,
    status: 'ACTIVE',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'chap-4',
    topicId: 'top-4',
    topicName: 'Parts of Speech & Idioms',
    subjectName: 'English Literature',
    nameEn: 'Subject-Verb Agreement & Gerunds',
    nameBn: 'সাবজেক্ট ভার্ব এগ্রিমেন্ট ও জেরান্ড',
    code: 'CHAP-ENG-01',
    questionsCount: 180,
    status: 'ACTIVE',
    createdAt: '2026-01-08T00:00:00Z',
  },
];

export const initialQuizzes: QuizDTO[] = [
  {
    id: 'quiz-1',
    titleEn: '46th BCS Preliminary Model Test 01',
    titleBn: '৪৬তম বিসিএস প্রিলিমিনারি মডেল টেস্ট ০১',
    slug: '46th-bcs-prelim-model-01',
    examId: 'exam-1',
    examName: '46th BCS Preliminary',
    totalMarks: 200,
    passMarks: 110,
    durationMinutes: 120,
    totalQuestions: 200,
    isPaid: true,
    priceBdt: 150,
    status: 'PUBLISHED',
    publishedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'quiz-2',
    titleEn: 'Medical Admission Mock Examination 2026',
    titleBn: 'মেডিকেল ভর্তি পরীক্ষা চূড়ান্ত স্পেশাল মডেল টেস্ট',
    slug: 'medical-admission-mock-2026',
    examId: 'exam-2',
    examName: 'Medical Admission 2026',
    totalMarks: 100,
    passMarks: 60,
    durationMinutes: 60,
    totalQuestions: 100,
    isPaid: true,
    priceBdt: 200,
    status: 'PUBLISHED',
    publishedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'quiz-3',
    titleEn: 'Bank Officer Cash (Preliminary) Live Test',
    titleBn: 'ব্যাংক অফিসার ক্যাশ (প্রিলি) লাইভ কুইজ',
    slug: 'bank-officer-cash-live',
    examId: 'exam-3',
    examName: 'Combined 8 Banks Officer',
    totalMarks: 100,
    passMarks: 50,
    durationMinutes: 60,
    totalQuestions: 100,
    isPaid: false,
    priceBdt: 0,
    status: 'DRAFT',
  },
];

export const initialUsers: UserDTO[] = [
  {
    id: 'usr-1',
    fullName: 'Rakib Hasan (Administrator)',
    email: 'rakib.edu.bd@gmail.com',
    phoneNumber: '+8801712345678',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    quizzesTaken: 42,
    totalSpendBdt: 0,
  },
  {
    id: 'usr-2',
    fullName: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@example.com',
    phoneNumber: '+8801819876543',
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2026-02-14T10:20:00Z',
    quizzesTaken: 18,
    totalSpendBdt: 750,
  },
  {
    id: 'usr-3',
    fullName: 'Nusrat Jahan',
    email: 'nusrat.jahan@example.com',
    phoneNumber: '+8801912445566',
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2026-02-28T14:10:00Z',
    quizzesTaken: 25,
    totalSpendBdt: 1200,
  },
  {
    id: 'usr-4',
    fullName: 'Dr. Shahin Alam',
    email: 'shahin.examiner@example.com',
    phoneNumber: '+8801511223344',
    role: 'EXAMINER',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
    quizzesTaken: 5,
    totalSpendBdt: 0,
  },
];

export const initialAttempts: AttemptDTO[] = [
  {
    id: 'att-501',
    quizId: 'quiz-1',
    quizTitle: '46th BCS Preliminary Model Test 01',
    userId: 'usr-2',
    userEmail: 'tanvir.ahmed@example.com',
    score: 138.5,
    totalMarks: 200,
    percentage: 69.25,
    status: 'COMPLETED',
    startedAt: '2026-03-20T09:00:00Z',
    submittedAt: '2026-03-20T10:48:00Z',
    timeTakenSeconds: 6480,
    correctCount: 148,
    incorrectCount: 38,
    skippedCount: 14,
  },
  {
    id: 'att-502',
    quizId: 'quiz-1',
    quizTitle: '46th BCS Preliminary Model Test 01',
    userId: 'usr-3',
    userEmail: 'nusrat.jahan@example.com',
    score: 154.25,
    totalMarks: 200,
    percentage: 77.12,
    status: 'COMPLETED',
    startedAt: '2026-03-20T11:00:00Z',
    submittedAt: '2026-03-20T12:35:00Z',
    timeTakenSeconds: 5700,
    correctCount: 162,
    incorrectCount: 31,
    skippedCount: 7,
  },
];

export const initialOrders: OrderPaymentDTO[] = [
  {
    id: 'ord-901',
    orderNumber: 'ORD-20260320-9941',
    userEmail: 'nusrat.jahan@example.com',
    amountBdt: 1200,
    gateway: 'SSLCOMMERZ',
    transactionId: 'SSL_TXN_7841920194',
    status: 'PAID',
    createdAt: '2026-03-20T08:45:00Z',
  },
  {
    id: 'ord-902',
    orderNumber: 'ORD-20260320-9942',
    userEmail: 'tanvir.ahmed@example.com',
    amountBdt: 150,
    gateway: 'AAMARPAY',
    transactionId: 'AAMAR_TXN_38102948',
    status: 'PAID',
    createdAt: '2026-03-20T08:55:00Z',
  },
];

import { apiGateway } from '../../../services/api-gateway/src/index.js';

// Base API URL configuration
export const DEFAULT_API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8787/api/v1';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('API_BASE_URL');
    if (saved) return saved;
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('API_BASE_URL', url.trim());
  }
}

/**
 * Normalizes and maps raw Prisma Category record to CategoryDTO
 */
export function mapPrismaCategory(cat: any): CategoryDTO {
  return {
    id: cat.id || `cat-${Date.now()}`,
    nameEn: cat.nameEn || cat.name || 'Untitled Category',
    nameBn: cat.nameBn || cat.name || '',
    slug: cat.slug || '',
    description: cat.description || '',
    examsCount: cat.examsCount ?? cat._count?.exams ?? (Array.isArray(cat.exams) ? cat.exams.length : 0),
    status: cat.status || (cat.isActive === false ? 'INACTIVE' : 'ACTIVE'),
    createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Normalizes and maps raw Prisma Exam record to ExamDTO
 */
export function mapPrismaExam(exam: any): ExamDTO {
  return {
    id: exam.id || `exam-${Date.now()}`,
    categoryId: exam.categoryId || '',
    categoryName: exam.categoryName || exam.category?.name || exam.category?.nameEn || 'General',
    nameEn: exam.nameEn || exam.name || 'Untitled Exam',
    nameBn: exam.nameBn || exam.name || '',
    code: exam.code || exam.slug || `EXAM-${(exam.id || '').slice(-4)}`,
    slug: exam.slug || '',
    totalMarks: exam.totalMarks ?? 100,
    durationMinutes: exam.durationMinutes ?? 60,
    quizzesCount: exam.quizzesCount ?? exam._count?.quizzes ?? (Array.isArray(exam.quizzes) ? exam.quizzes.length : 0),
    subjectsCount: exam.subjectsCount ?? exam._count?.subjects ?? 0,
    status: exam.status || (exam.isActive === false ? 'INACTIVE' : 'ACTIVE'),
    createdAt: exam.createdAt ? new Date(exam.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Normalizes and maps raw Prisma Quiz record to QuizDTO
 */
export function mapPrismaQuiz(quiz: any): QuizDTO {
  const durationMin =
    quiz.durationMinutes ??
    (quiz.durationSeconds ? Math.round(quiz.durationSeconds / 60) : 60);

  const priceVal = Number(quiz.priceBdt ?? quiz.price ?? 0);
  const isPaidVal = Boolean(quiz.isPaid ?? (priceVal > 0));

  return {
    id: quiz.id || `quiz-${Date.now()}`,
    titleEn: quiz.titleEn || quiz.title || 'Untitled Quiz',
    titleBn: quiz.titleBn || quiz.title || '',
    slug: quiz.slug || '',
    examId: quiz.examId || '',
    examName: quiz.examName || quiz.exam?.name || quiz.exam?.nameEn || 'Exam',
    totalMarks: Number(quiz.totalMarks ?? 100),
    passMarks: Number(
      quiz.passMarks ??
        (quiz.passPercentage
          ? Math.round((quiz.passPercentage / 100) * (quiz.totalMarks || 100))
          : 50)
    ),
    durationMinutes: durationMin,
    totalQuestions:
      quiz.totalQuestions ??
      quiz._count?.quizQuestions ??
      (Array.isArray(quiz.quizQuestions) ? quiz.quizQuestions.length : 0),
    isPaid: isPaidVal,
    priceBdt: priceVal,
    status: quiz.status || 'DRAFT',
    publishedAt: quiz.publishedAt ? new Date(quiz.publishedAt).toISOString() : undefined,
  };
}

/**
 * Normalizes and maps raw Prisma Subject record to SubjectDTO
 */
export function mapPrismaSubject(sub: any): SubjectDTO {
  return {
    id: sub.id || `sub-${Date.now()}`,
    examId: sub.examId || 'exam-1',
    examName: sub.examName || sub.exam?.name || 'General Exam',
    nameEn: sub.nameEn || sub.name || 'Untitled Subject',
    nameBn: sub.nameBn || sub.name || '',
    code: sub.code || sub.slug || `SUB-${(sub.id || '').slice(-4)}`,
    slug: sub.slug || '',
    marksWeightage: sub.marksWeightage || 30,
    topicsCount: sub.topicsCount ?? sub._count?.topics ?? (Array.isArray(sub.topics) ? sub.topics.length : 0),
    status: sub.status || 'ACTIVE',
    createdAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Normalizes and maps raw Prisma Topic record to TopicDTO
 */
export function mapPrismaTopic(top: any): TopicDTO {
  return {
    id: top.id || `top-${Date.now()}`,
    subjectId: top.subjectId || '',
    subjectName: top.subjectName || top.subject?.name || top.subject?.nameEn || 'Subject',
    nameEn: top.nameEn || top.name || 'Untitled Topic',
    nameBn: top.nameBn || top.name || '',
    code: top.code || top.slug || `TOP-${(top.id || '').slice(-4)}`,
    slug: top.slug || '',
    chaptersCount: top.chaptersCount ?? top._count?.chapters ?? 0,
    questionsCount: top.questionsCount ?? top._count?.questions ?? (Array.isArray(top.questions) ? top.questions.length : 0),
    status: top.status || 'ACTIVE',
    createdAt: top.createdAt ? new Date(top.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Normalizes and maps raw Prisma Chapter record to ChapterDTO
 */
export function mapPrismaChapter(ch: any): ChapterDTO {
  return {
    id: ch.id || `ch-${Date.now()}`,
    topicId: ch.topicId || '',
    topicName: ch.topicName || ch.topic?.name || ch.topic?.nameEn || 'Topic',
    subjectName: ch.subjectName || ch.subject?.name || 'Subject',
    nameEn: ch.nameEn || ch.name || 'Untitled Chapter',
    nameBn: ch.nameBn || ch.name || '',
    code: ch.code || ch.slug || `CH-${(ch.id || '').slice(-4)}`,
    slug: ch.slug || '',
    questionsCount: ch.questionsCount ?? ch._count?.questions ?? 0,
    status: ch.status || 'ACTIVE',
    createdAt: ch.createdAt ? new Date(ch.createdAt).toISOString() : new Date().toISOString(),
  };
}

export interface LiveApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
  isLiveBackend: boolean;
  error?: string;
}

/**
 * Smart API client: Attempts live HTTP fetch to Hono on Wrangler/Cloudflare first.
 * If server is offline / unreachable, gracefully falls back to the in-memory Microservices Gateway.
 */
export async function apiFetch<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<LiveApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  const fullUrl = `${baseUrl.replace(/\/+$/, '')}${cleanPath}`;
  const method = options.method || 'GET';

  // 1. Attempt live HTTP request to Hono API (e.g. http://localhost:8787/api/v1/...)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (options.token) {
      reqHeaders['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await fetch(fullUrl, {
      method,
      headers: reqHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      data: data.data !== undefined ? data.data : data,
      isLiveBackend: true,
      error: response.ok ? undefined : data.error || `HTTP ${response.status}`,
    };
  } catch (err: any) {
    // 2. Fallback to in-memory worker gateway if live backend is unreachable
    console.warn(`[API] Live backend at ${fullUrl} not reachable. Falling back to local Gateway:`, err.message);

    try {
      const fallback = await executeWorkerApi(cleanPath, method, options.body, options.token);
      const resData = fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
      return {
        ok: fallback.ok,
        status: fallback.status,
        data: resData as T,
        isLiveBackend: false,
        error: fallback.ok ? undefined : fallback.data?.error || 'Local fallback error',
      };
    } catch (fallbackErr: any) {
      return {
        ok: false,
        status: 500,
        data: null as any,
        isLiveBackend: false,
        error: fallbackErr.message || 'API request failed',
      };
    }
  }
}

/**
 * Direct invoker for the Cloudflare Microservices API Gateway
 */
export async function executeWorkerApi(
  path: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  const url = `https://api.example.com/api/v1${path.startsWith('/') ? path : '/' + path}`;
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const req = new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await apiGateway.fetch(req);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

