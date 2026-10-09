import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AdminSidebar } from './components/admin/layout/AdminSidebar.js';
import { AdminHeader } from './components/admin/layout/AdminHeader.js';
import { DashboardPage } from './components/admin/pages/DashboardPage.js';
import { QuestionsPage } from './components/admin/pages/QuestionsPage.js';
import { QuestionEditor } from './components/admin/questions/QuestionEditor.js';
import { CatalogPage } from './components/admin/pages/CatalogPage.js';
import { QuizzesPage } from './components/admin/pages/QuizzesPage.js';
import { ImportsPage } from './components/admin/pages/ImportsPage.js';
import { UsersPage } from './components/admin/pages/UsersPage.js';
import { AttemptsResultsPage } from './components/admin/pages/AttemptsResultsPage.js';
import { PaymentsSubscriptionsPage } from './components/admin/pages/PaymentsSubscriptionsPage.js';
import { GamificationPage } from './components/admin/pages/GamificationPage.js';
import { RolesAuditSettingsPage } from './components/admin/pages/RolesAuditSettingsPage.js';

import {
  QuestionDTO,
  QuizDTO,
  UserDTO,
  AttemptDTO,
  OrderPaymentDTO,
  initialQuestions,
  initialQuizzes,
  initialUsers,
  initialAttempts,
  initialOrders,
  executeWorkerApi,
} from './lib/api/client.js';

import {
  Zap,
  Server,
  Layers,
  FileCode,
  CheckCircle2,
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  Database,
  ArrowRight,
  Clock,
  Key,
} from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('/admin/dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'admin' | 'api-playground'>('admin');

  // Dynamic state for real interactive mutations
  const [questions, setQuestions] = useState<QuestionDTO[]>(initialQuestions);
  const [quizzes, setQuizzes] = useState<QuizDTO[]>(initialQuizzes);
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [attempts, setAttempts] = useState<AttemptDTO[]>(initialAttempts);
  const [orders, setOrders] = useState<OrderPaymentDTO[]>(initialOrders);

  const [editingQuestion, setEditingQuestion] = useState<QuestionDTO | null>(null);

  // API Playground State
  const [selectedApiTest, setSelectedApiTest] = useState<string>('start_quiz');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [currentActiveAttemptId, setCurrentActiveAttemptId] = useState<string | null>(null);

  // Router handler
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (path === '/admin/questions/new') {
      setEditingQuestion(null);
    }
  };

  const handleSaveQuestion = (saved: QuestionDTO) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    toast.success(`Question ${saved.code} successfully saved to Hostinger MySQL!`);
    setCurrentPath('/admin/questions');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDuplicateQuestion = (q: QuestionDTO) => {
    const duplicated: QuestionDTO = {
      ...q,
      id: `q-${Date.now()}`,
      code: `${q.code}-COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuestions((prev) => [duplicated, ...prev]);
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
          : u
      )
    );
  };

  // Run live API endpoint on Cloudflare Worker router
  const handleRunApiTest = async (testKey: string) => {
    setApiLoading(true);
    setApiResponse(null);
    setApiStatus(null);

    try {
      let res: { status: number; ok: boolean; data: any };

      switch (testKey) {
        case 'health':
          res = await executeWorkerApi('/health', 'GET');
          break;

        case 'register_user':
          res = await executeWorkerApi('/auth/register', 'POST', {
            name: 'New Candidate Aspirant',
            email: `aspirant_${Date.now()}@example.com`,
            password: 'SecurePass2026!',
            role: 'USER',
          });
          break;

        case 'login_user':
          res = await executeWorkerApi('/auth/login', 'POST', {
            email: 'tanvir@example.com',
            password: 'password',
          });
          break;

        case 'list_quizzes':
          res = await executeWorkerApi('/quizzes', 'GET');
          break;

        case 'start_quiz':
          res = await executeWorkerApi('/quizzes/quiz_bcs_model_01/start', 'POST', {
            requestId: `req_${Date.now()}`,
          });
          if (res.data?.attemptId) {
            setCurrentActiveAttemptId(res.data.attemptId);
          }
          break;

        case 'save_answer': {
          const attemptId = currentActiveAttemptId || 'att_demo_1';
          res = await executeWorkerApi(`/attempts/${attemptId}/answers`, 'POST', {
            questionId: 'q_alg_01',
            selectedOptionId: 'opt_q1_a', // Correct option (9)
            timeTakenSeconds: 32,
          });
          break;
        }

        case 'submit_scoring': {
          const attemptId = currentActiveAttemptId || 'att_demo_1';
          res = await executeWorkerApi(`/attempts/${attemptId}/submit`, 'POST');
          break;
        }

        case 'create_order':
          res = await executeWorkerApi('/orders', 'POST', {
            quizId: 'quiz_bcs_model_01',
            idempotencyKey: `idemp_${Date.now()}`,
          });
          break;

        case 'verify_payment':
          res = await executeWorkerApi('/payments/verify', 'POST', {
            providerReference: 'SSLCOMMERZ_TXN_TEST_101',
          });
          break;

        case 'offline_sync':
          res = await executeWorkerApi('/sync/attempts', 'POST', {
            syncKey: `sqlite_sync_${Date.now()}`,
            quizId: 'quiz_bcs_model_01',
            timeTakenSeconds: 1450,
            answers: [
              { questionId: 'q_alg_01', selectedOptionId: 'opt_q1_a' },
              { questionId: 'q_alg_02', selectedOptionId: 'opt_q2_b' },
            ],
          });
          break;

        case 'leaderboard':
          res = await executeWorkerApi('/quizzes/quiz_bcs_model_01/leaderboard', 'GET');
          break;

        default:
          res = await executeWorkerApi('/health', 'GET');
      }

      setApiStatus(res.status);
      setApiResponse(res.data);
      if (res.ok) {
        toast.success(`HTTP ${res.status} OK - Worker API executed successfully`);
      } else {
        toast.error(`HTTP ${res.status} - ${res.data?.error || 'API Error'}`);
      }
    } catch (err: any) {
      setApiStatus(500);
      setApiResponse({ error: err?.message || 'Execution failed' });
      toast.error('Network or Worker execution error');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans`}>
      <Toaster position="top-right" richColors theme={isDarkMode ? 'dark' : 'light'} />

      {/* Top Global Mode Switcher */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-400">QuizPlatform Backend & Admin:</span>
          <span className="text-slate-400 hidden sm:inline">
            Prisma MySQL Schema (21 Models) • Cloudflare Workers Hono API • Next.js App Router
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('admin')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              viewMode === 'admin'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Next.js Admin Dashboard
          </button>
          <button
            onClick={() => {
              setViewMode('api-playground');
              if (!apiResponse) handleRunApiTest('start_quiz');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === 'api-playground'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="h-3 w-3" /> Live API Runner & Prisma Schema
          </button>
        </div>
      </div>

      {viewMode === 'admin' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Admin Collapsible Sidebar */}
          <AdminSidebar
            currentPath={currentPath}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Admin Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Header with Breadcrumbs, Search & Profile */}
            <AdminHeader
              currentPath={currentPath}
              onNavigate={handleNavigate}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            />

            {/* Page Router View */}
            <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
              {currentPath === '/admin/dashboard' && (
                <DashboardPage onNavigate={handleNavigate} />
              )}

              {currentPath === '/admin/questions' && (
                <QuestionsPage
                  questions={questions}
                  onNewQuestion={() => {
                    setEditingQuestion(null);
                    setCurrentPath('/admin/questions/new');
                  }}
                  onEditQuestion={(q) => {
                    setEditingQuestion(q);
                    setCurrentPath(`/admin/questions/${q.id}/edit`);
                  }}
                  onDeleteQuestion={handleDeleteQuestion}
                  onDuplicateQuestion={handleDuplicateQuestion}
                  onNavigateToImports={() => setCurrentPath('/admin/imports')}
                />
              )}

              {(currentPath === '/admin/questions/new' || currentPath.includes('/edit')) && (
                <QuestionEditor
                  initialData={editingQuestion}
                  onSave={handleSaveQuestion}
                  onCancel={() => setCurrentPath('/admin/questions')}
                  onDuplicate={handleDuplicateQuestion}
                />
              )}

              {(currentPath === '/admin/categories' ||
                currentPath === '/admin/exams' ||
                currentPath === '/admin/subjects' ||
                currentPath === '/admin/topics' ||
                currentPath === '/admin/chapters') && <CatalogPage />}

              {currentPath === '/admin/quizzes' && (
                <QuizzesPage
                  quizzes={quizzes}
                  onNewQuiz={() => toast.info('New Quiz modal triggered')}
                  onEditQuiz={(q) => toast.info(`Editing quiz: ${q.titleEn}`)}
                />
              )}

              {currentPath === '/admin/imports' && <ImportsPage />}

              {currentPath === '/admin/users' && (
                <UsersPage users={users} onToggleStatus={handleToggleUserStatus} />
              )}

              {(currentPath === '/admin/attempts' || currentPath === '/admin/results') && (
                <AttemptsResultsPage attempts={attempts} />
              )}

              {(currentPath === '/admin/orders' ||
                currentPath === '/admin/payments' ||
                currentPath === '/admin/subscriptions' ||
                currentPath === '/admin/coupons') && (
                <PaymentsSubscriptionsPage orders={orders} />
              )}

              {(currentPath === '/admin/leaderboards' ||
                currentPath === '/admin/achievements' ||
                currentPath === '/admin/notifications') && <GamificationPage />}

              {(currentPath === '/admin/roles' ||
                currentPath === '/admin/audit-logs' ||
                currentPath === '/admin/settings') && <RolesAuditSettingsPage />}
            </main>
          </div>
        </div>
      ) : (
        /* LIVE API RUNNER & PRISMA SCHEMA PLAYGROUND */
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-400" />
                  Prisma Models & Cloudflare Workers Live API Endpoint Runner
                </h2>
                <p className="text-xs text-slate-400">
                  Full implementation of the 21 models: User, Session, Device, Category, Exam, Subject, Topic, Quiz, Question, Option, QuizQuestion, QuizAttempt, AttemptAnswer, Order, Payment, QuizAccess, Bookmark, SavedQuiz, Badge, UserBadge, LeaderboardEntry, OfflineSync.
                </p>
              </div>
              <button
                onClick={() => setViewMode('admin')}
                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold self-start sm:self-auto"
              >
                Go to Admin Dashboard →
              </button>
            </div>

            {/* Test Launcher Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: List of Schema Endpoints */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Select Model Endpoint to Execute:
                </span>

                {[
                  {
                    key: 'start_quiz',
                    label: 'POST /api/v1/quizzes/:id/start',
                    desc: 'Starts timed QuizAttempt, sets expiresAt, returns questions',
                    badge: 'QuizAttempt',
                  },
                  {
                    key: 'save_answer',
                    label: 'POST /api/v1/attempts/:id/answers',
                    desc: 'Records AttemptAnswer (questionId, selectedOptionId, timer)',
                    badge: 'AttemptAnswer',
                  },
                  {
                    key: 'submit_scoring',
                    label: 'POST /api/v1/attempts/:id/submit',
                    desc: 'Evaluates correctness, applies negative marks, updates LeaderboardEntry & Badge',
                    badge: 'Scoring Engine',
                  },
                  {
                    key: 'create_order',
                    label: 'POST /api/v1/orders',
                    desc: 'Creates Order with amount, currency, idempotencyKey',
                    badge: 'Order',
                  },
                  {
                    key: 'verify_payment',
                    label: 'POST /api/v1/payments/verify',
                    desc: 'Verifies SSLCommerz/AamarPay, grants QuizAccess',
                    badge: 'Payment / QuizAccess',
                  },
                  {
                    key: 'offline_sync',
                    label: 'POST /api/v1/sync/attempts',
                    desc: 'Processes offline SQLite syncKey idempotently & scores attempts',
                    badge: 'OfflineSync',
                  },
                  {
                    key: 'leaderboard',
                    label: 'GET /api/v1/quizzes/:id/leaderboard',
                    desc: 'Ranks candidates by bestScore descending',
                    badge: 'LeaderboardEntry',
                  },
                  {
                    key: 'register_user',
                    label: 'POST /api/v1/auth/register',
                    desc: 'Creates User with role, hashed password, and Session',
                    badge: 'User / Session',
                  },
                  {
                    key: 'list_quizzes',
                    label: 'GET /api/v1/quizzes',
                    desc: 'Fetches quizzes with exam metadata and question counts',
                    badge: 'Quiz',
                  },
                  {
                    key: 'health',
                    label: 'GET /api/v1/health',
                    desc: 'Worker health, uptime, and Hyperdrive binding status',
                    badge: 'Health',
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedApiTest(item.key);
                      handleRunApiTest(item.key);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                      selectedApiTest === item.key
                        ? 'bg-orange-600/15 border-orange-500 shadow-md shadow-orange-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-orange-400 font-mono px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
                  </button>
                ))}
              </div>

              {/* Right Columns: Live Execution Console */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live Execution Output</span>
                    {apiStatus && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          apiStatus >= 200 && apiStatus < 300
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        HTTP {apiStatus}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRunApiTest(selectedApiTest)}
                    disabled={apiLoading}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3 w-3 ${apiLoading ? 'animate-spin' : ''}`} />
                    {apiLoading ? 'Executing...' : 'Re-run Endpoint'}
                  </button>
                </div>

                {/* Response Code Block */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-x-auto min-h-[360px]">
                  {apiLoading ? (
                    <div className="flex flex-col items-center justify-center h-72 text-slate-500 gap-2">
                      <RotateCcw className="h-6 w-6 animate-spin text-orange-500" />
                      <span>Executing Worker API in isolate...</span>
                    </div>
                  ) : apiResponse ? (
                    <pre className="text-emerald-300 leading-relaxed text-[11px]">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-500 flex items-center justify-center h-72">
                      Select an endpoint from the left column to execute.
                    </div>
                  )}
                </div>

                {/* Schema Summary Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-orange-400" /> Hostinger MySQL Prisma Model Relationships:
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <code>Category</code> → <code>Exam</code> → <code>Quiz</code> → <code>QuizQuestion</code> → <code>Question</code> → <code>Option</code>.
                    <br />
                    <code>QuizAttempt</code> holds <code>AttemptAnswer</code> records linked to <code>SelectedOption</code>. Upon submission, the engine computes penalties (<code>negativeMark</code>) and updates <code>LeaderboardEntry</code> and <code>UserBadge</code>.
                    <br />
                    <code>Order</code> → <code>Payment</code> → <code>QuizAccess</code> grants time-bounded entrance to paid exams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
