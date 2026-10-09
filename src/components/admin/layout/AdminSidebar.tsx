import React from 'react';
import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  BookOpen,
  FileQuestion,
  HelpCircle,
  FileSpreadsheet,
  Users,
  Award,
  CreditCard,
  Receipt,
  RotateCcw,
  Bell,
  ShieldCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
  BarChart3,
  BookmarkCheck,
} from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: string[];
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Catalog & Curriculum',
    items: [
      { id: 'categories', label: 'Categories', path: '/admin/categories', icon: Layers },
      { id: 'exams', label: 'Exams', path: '/admin/exams', icon: GraduationCap },
      { id: 'subjects', label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
      { id: 'topics', label: 'Topics', path: '/admin/topics', icon: BookmarkCheck },
      { id: 'chapters', label: 'Chapters', path: '/admin/chapters', icon: BookOpen },
    ],
  },
  {
    group: 'Quiz Delivery',
    items: [
      { id: 'quizzes', label: 'Quizzes', path: '/admin/quizzes', icon: FileQuestion, badge: '3 Active' },
      { id: 'questions', label: 'Question Bank', path: '/admin/questions', icon: HelpCircle, badge: '12.4k' },
      { id: 'imports', label: 'CSV Import & Validation', path: '/admin/imports', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'Students & Attempts',
    items: [
      { id: 'users', label: 'Users & Candidates', path: '/admin/users', icon: Users },
      { id: 'attempts', label: 'Quiz Attempts', path: '/admin/attempts', icon: History },
      { id: 'results', label: 'Result Reports', path: '/admin/results', icon: BarChart3 },
    ],
  },
  {
    group: 'Finance & Payments',
    items: [
      { id: 'orders', label: 'Orders', path: '/admin/orders', icon: Receipt },
      { id: 'payments', label: 'Payments (SSL/AamarPay)', path: '/admin/payments', icon: CreditCard },
      { id: 'subscriptions', label: 'Subscriptions', path: '/admin/subscriptions', icon: RotateCcw },
      { id: 'coupons', label: 'Coupons & Discounts', path: '/admin/coupons', icon: Sparkles },
    ],
  },
  {
    group: 'Gamification & Eng.',
    items: [
      { id: 'leaderboards', label: 'Leaderboards', path: '/admin/leaderboards', icon: Award },
      { id: 'achievements', label: 'Badges & Streaks', path: '/admin/achievements', icon: Award },
      { id: 'notifications', label: 'Push & Broadcast', path: '/admin/notifications', icon: Bell },
    ],
  },
  {
    group: 'Governance & Security',
    items: [
      { id: 'roles', label: 'Roles & RBAC', path: '/admin/roles', icon: ShieldCheck },
      { id: 'audit-logs', label: 'Audit Trail', path: '/admin/audit-logs', icon: History },
      { id: 'settings', label: 'Platform Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentPath,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <Database className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight truncate">
              <span className="font-bold text-sm text-white tracking-tight">QuizAdmin</span>
              <span className="text-[10px] block text-orange-400 font-mono">Cloudflare + Hono</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Database className="h-4 w-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="h-7 w-7 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed && (
              <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {group.group}
              </h4>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative",
                    isActive
                      ? "bg-orange-600/15 text-orange-400 border border-orange-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-orange-400" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && isActive && (
                    <div className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-slate-800">
        <div className={cn("flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80", collapsed && "justify-center")}>
          <div className="h-6 w-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            RH
          </div>
          {!collapsed && (
            <div className="leading-tight overflow-hidden text-left">
              <div className="text-xs font-semibold text-white truncate">Rakib Hasan</div>
              <div className="text-[10px] text-emerald-400">Super Admin (Online)</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
