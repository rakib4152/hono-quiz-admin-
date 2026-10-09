/**
 * Database Store Service matching the Prisma Schema
 * Engine: MySQL 8.0.x InnoDB
 * Models: User, Session, Device, Category, Exam, Subject, Topic, Quiz, Question,
 *         Option, QuizQuestion, QuizAttempt, AttemptAnswer, Order, Payment,
 *         QuizAccess, Bookmark, SavedQuiz, Badge, UserBadge, LeaderboardEntry, OfflineSync.
 */

export type Role = 'USER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'ABANDONED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  passwordHash: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface DeviceRecord {
  id: string;
  userId: string;
  deviceKey: string;
  platform: string;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamRecord {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface SubjectRecord {
  id: string;
  name: string;
  slug: string;
}

export interface TopicRecord {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
}

export interface QuizRecord {
  id: string;
  examId: string;
  title: string;
  slug: string;
  description: string | null;
  status: QuizStatus;
  price: number;
  currency: string;
  durationSeconds: number | null;
  passPercentage: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMark: number;
  maxAttempts: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  body: string;
  explanation: string | null;
  difficulty: number;
  marks: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionRecord {
  id: string;
  questionId: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  position: number;
}

export interface QuizQuestionRecord {
  quizId: string;
  questionId: string;
  position: number;
  marks: number | null;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  quizId: string;
  status: AttemptStatus;
  requestId: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  maxScore: number;
  percentage: number;
  timeTakenSeconds: number | null;
}

export interface AttemptAnswerRecord {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  timeTakenSeconds: number | null;
  answeredAt: Date;
}

export interface OrderRecord {
  id: string;
  userId: string;
  quizId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  idempotencyKey: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface QuizAccessRecord {
  id: string;
  userId: string;
  quizId: string;
  orderId: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
}

export interface BookmarkRecord {
  userId: string;
  questionId: string;
  createdAt: Date;
}

export interface SavedQuizRecord {
  userId: string;
  quizId: string;
  createdAt: Date;
}

export interface BadgeRecord {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface UserBadgeRecord {
  userId: string;
  badgeId: string;
  earnedAt: Date;
}

export interface LeaderboardEntryRecord {
  id: string;
  userId: string;
  quizId: string;
  bestScore: number;
  bestPercentage: number;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface OfflineSyncRecord {
  id: string;
  userId: string;
  syncKey: string;
  status: string;
  createdAt: Date;
  processedAt: Date | null;
}

/**
 * Seed initial data representing production Hostinger MySQL state
 */
class DatabaseStore {
  users: Map<string, UserRecord> = new Map();
  sessions: Map<string, SessionRecord> = new Map();
  devices: Map<string, DeviceRecord> = new Map();
  categories: Map<string, CategoryRecord> = new Map();
  exams: Map<string, ExamRecord> = new Map();
  subjects: Map<string, SubjectRecord> = new Map();
  topics: Map<string, TopicRecord> = new Map();
  quizzes: Map<string, QuizRecord> = new Map();
  questions: Map<string, QuestionRecord> = new Map();
  options: Map<string, OptionRecord> = new Map();
  quizQuestions: Map<string, QuizQuestionRecord> = new Map();
  quizAttempts: Map<string, QuizAttemptRecord> = new Map();
  attemptAnswers: Map<string, AttemptAnswerRecord> = new Map();
  orders: Map<string, OrderRecord> = new Map();
  payments: Map<string, PaymentRecord> = new Map();
  quizAccess: Map<string, QuizAccessRecord> = new Map();
  bookmarks: Map<string, BookmarkRecord> = new Map();
  savedQuizzes: Map<string, SavedQuizRecord> = new Map();
  badges: Map<string, BadgeRecord> = new Map();
  userBadges: Map<string, UserBadgeRecord> = new Map();
  leaderboards: Map<string, LeaderboardEntryRecord> = new Map();
  offlineSyncs: Map<string, OfflineSyncRecord> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    // 1. Users
    const adminUser: UserRecord = {
      id: 'usr_superadmin1',
      name: 'Rakib Hasan (Super Admin)',
      email: 'rakib.edu.bd@gmail.com',
      passwordHash: 'pbkdf2_sha256$260000$hash$12345678',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const studentUser: UserRecord = {
      id: 'usr_student1',
      name: 'Tanvir Ahmed',
      email: 'tanvir@example.com',
      passwordHash: 'pbkdf2_sha256$260000$hash$87654321',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    };
    this.users.set(adminUser.id, adminUser);
    this.users.set(studentUser.id, studentUser);

    // 2. Active Session for API testing
    this.sessions.set('sess_token_admin', {
      id: 'sess_1',
      tokenHash: 'token_admin_test_123',
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 86400000 * 30),
      createdAt: new Date(),
    });

    // 3. Category, Exam, Subject, Topic
    const category: CategoryRecord = {
      id: 'cat_job_prep',
      name: 'Job Preparation (চাকরি প্রস্তুতি)',
      slug: 'job-preparation',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.set(category.id, category);

    const exam: ExamRecord = {
      id: 'exam_bcs_46',
      categoryId: category.id,
      name: '46th BCS Preliminary (৪৬তম বিসিএস প্রিলিমিনারি)',
      slug: '46th-bcs-preliminary',
      description: 'Comprehensive 200 marks preliminary model exam series.',
    };
    this.exams.set(exam.id, exam);

    const subject: SubjectRecord = {
      id: 'sub_math',
      name: 'Mathematics & Mental Ability (গাণিতিক যুক্তি ও মানসিক দক্ষতা)',
      slug: 'math-mental-ability',
    };
    this.subjects.set(subject.id, subject);

    const topic: TopicRecord = {
      id: 'top_algebra',
      subjectId: subject.id,
      name: 'Algebraic Formulas (বীজগণিতীয় সূত্রাবলী)',
      slug: 'algebraic-formulas',
    };
    this.topics.set(topic.id, topic);

    // 4. Questions & Options
    const q1: QuestionRecord = {
      id: 'q_alg_01',
      subjectId: subject.id,
      topicId: topic.id,
      body: 'If x + y = 7 and xy = 10, what is the value of (x - y)^2? (যদি x + y = 7 এবং xy = 10 হয়, তবে (x - y)^2 এর মান কত?)',
      explanation: '(x - y)^2 = (x + y)^2 - 4xy = 7^2 - 4(10) = 49 - 40 = 9.',
      difficulty: 2,
      marks: 1.0,
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.questions.set(q1.id, q1);

    const q1_opts: OptionRecord[] = [
      { id: 'opt_q1_a', questionId: q1.id, text: '9 (৯)', imageUrl: null, isCorrect: true, position: 1 },
      { id: 'opt_q1_b', questionId: q1.id, text: '14 (১৪)', imageUrl: null, isCorrect: false, position: 2 },
      { id: 'opt_q1_c', questionId: q1.id, text: '29 (২৯)', imageUrl: null, isCorrect: false, position: 3 },
      { id: 'opt_q1_d', questionId: q1.id, text: '49 (৪৯)', imageUrl: null, isCorrect: false, position: 4 },
    ];
    q1_opts.forEach((o) => this.options.set(o.id, o));

    const q2: QuestionRecord = {
      id: 'q_alg_02',
      subjectId: subject.id,
      topicId: topic.id,
      body: 'What is the sum of interior angles of a pentagon? (একটি সুষম পঞ্চভুজের অভ্যন্তরীণ কোণগুলোর সমষ্টি কত?)',
      explanation: 'Formula: (n - 2) * 180° = (5 - 2) * 180° = 3 * 180° = 540°',
      difficulty: 2,
      marks: 1.0,
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.questions.set(q2.id, q2);

    const q2_opts: OptionRecord[] = [
      { id: 'opt_q2_a', questionId: q2.id, text: '360°', imageUrl: null, isCorrect: false, position: 1 },
      { id: 'opt_q2_b', questionId: q2.id, text: '540°', imageUrl: null, isCorrect: true, position: 2 },
      { id: 'opt_q2_c', questionId: q2.id, text: '720°', imageUrl: null, isCorrect: false, position: 3 },
      { id: 'opt_q2_d', questionId: q2.id, text: '900°', imageUrl: null, isCorrect: false, position: 4 },
    ];
    q2_opts.forEach((o) => this.options.set(o.id, o));

    // 5. Quiz
    const quiz: QuizRecord = {
      id: 'quiz_bcs_model_01',
      examId: exam.id,
      title: '46th BCS Preliminary Special Model Test 01',
      slug: '46th-bcs-prelim-special-01',
      description: 'National preliminary examination simulation with negative marking and timer.',
      status: 'PUBLISHED',
      price: 150,
      currency: 'BDT',
      durationSeconds: 3600, // 60 minutes
      passPercentage: 50.0,
      shuffleQuestions: true,
      shuffleOptions: false,
      negativeMark: 0.25,
      maxAttempts: 3,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.quizzes.set(quiz.id, quiz);

    // Link Quiz to Questions
    this.quizQuestions.set(`${quiz.id}_${q1.id}`, {
      quizId: quiz.id,
      questionId: q1.id,
      position: 1,
      marks: 1.0,
    });
    this.quizQuestions.set(`${quiz.id}_${q2.id}`, {
      quizId: quiz.id,
      questionId: q2.id,
      position: 2,
      marks: 1.0,
    });

    // 6. Access Grant for demo student
    this.quizAccess.set(`${studentUser.id}_${quiz.id}`, {
      id: 'acc_1',
      userId: studentUser.id,
      quizId: quiz.id,
      orderId: null,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000 * 365),
    });

    // 7. Badges
    const badge: BadgeRecord = {
      id: 'bdg_pioneer',
      name: 'BCS Preliminary Achiever',
      description: 'Completed your first timed model test with 80%+ score',
      imageUrl: 'https://assets.example.com/badges/bcs-gold.png',
    };
    this.badges.set(badge.id, badge);
  }
}

export const dbStore = new DatabaseStore();
