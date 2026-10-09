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

import apiWorker from '../../../apps/api/src/index.js';

/**
 * Direct invoker for the Cloudflare Worker API
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

  const res = await apiWorker.fetch(req, { ENVIRONMENT: 'production', API_VERSION: 'v1' }, {});
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

