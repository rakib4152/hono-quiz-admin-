import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import {
  AdminSidebar,
} from './components/admin/layout/AdminSidebar.js';
import {
  AdminHeader,
} from './components/admin/layout/AdminHeader.js';
import {
  DashboardPage,
} from './components/admin/pages/DashboardPage.js';
import {
  QuestionsPage,
} from './components/admin/pages/QuestionsPage.js';
import {
  QuestionEditor,
} from './components/admin/questions/QuestionEditor.js';
import {
  CatalogPage,
} from './components/admin/pages/CatalogPage.js';
import {
  QuizzesPage,
} from './components/admin/pages/QuizzesPage.js';
import {
  ImportsPage,
} from './components/admin/pages/ImportsPage.js';
import {
  UsersPage,
} from './components/admin/pages/UsersPage.js';
import {
  AttemptsResultsPage,
} from './components/admin/pages/AttemptsResultsPage.js';
import {
  PaymentsSubscriptionsPage,
} from './components/admin/pages/PaymentsSubscriptionsPage.js';
import {
  GamificationPage,
} from './components/admin/pages/GamificationPage.js';
import {
  RolesAuditSettingsPage,
} from './components/admin/pages/RolesAuditSettingsPage.js';

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
} from './lib/api/client.js';

import {
  Zap,
  Server,
  Layers,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('/admin/dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'admin' | 'arch-workbench'>('admin');

  // Dynamic state for real interactive mutations
  const [questions, setQuestions] = useState<QuestionDTO[]>(initialQuestions);
  const [quizzes, setQuizzes] = useState<QuizDTO[]>(initialQuizzes);
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [attempts, setAttempts] = useState<AttemptDTO[]>(initialAttempts);
  const [orders, setOrders] = useState<OrderPaymentDTO[]>(initialOrders);

  const [editingQuestion, setEditingQuestion] = useState<QuestionDTO | null>(null);

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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans`}>
      <Toaster position="top-right" richColors theme={isDarkMode ? 'dark' : 'light'} />

      {/* Mode Switcher Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-400">QuizPlatform Master Solution:</span>
          <span className="text-slate-400 hidden sm:inline">
            Next.js 15 App Router Frontend + Cloudflare Workers Hono API + Prisma Driver Adapter
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
            onClick={() => setViewMode('arch-workbench')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              viewMode === 'arch-workbench'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Phase 1 Architecture & PoC
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
        /* Architecture & Phase 1 PoC Workbench */
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-400" />
                  Cloudflare Workers + Hono + Hyperdrive + Hostinger MySQL Architecture Console
                </h2>
                <p className="text-xs text-slate-400">
                  Inspecting Edge configuration, driver adapters, and Hostinger connection pool settings.
                </p>
              </div>
              <button
                onClick={() => setViewMode('admin')}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
              >
                Return to Next.js Admin Panel →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-4 w-4" /> Prisma Driver Adapter
                </div>
                <div className="text-xs font-mono text-white">@prisma/adapter-mariadb</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Executes TCP SQL over <code className="text-slate-300">cloudflare:sockets</code> via Hyperdrive.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <Zap className="h-4 w-4" /> Hyperdrive Pooling
                </div>
                <div className="text-xs font-mono text-white">env.HYPERDRIVE.connectionString</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Multiplexes 5,000 students to 20 Hostinger connections, preventing exhaustion.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 mb-1">
                  <Layers className="h-4 w-4" /> Next.js Hostinger Deployment
                </div>
                <div className="text-xs font-mono text-white">output: 'export' (Static SPA)</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Calls Worker API over HTTPS. Zero database secrets bundled in browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
