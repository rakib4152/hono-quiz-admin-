import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  Shield,
  LogOut,
  ExternalLink,
  Menu,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';

interface AdminHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onToggleMobileMenu?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentPath,
  onNavigate,
  onToggleMobileMenu,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Generate breadcrumbs from path
  const pathParts = currentPath.split('/').filter(Boolean);

  const notifications = [
    {
      id: 'n-1',
      title: 'Hyperdrive Connection Verified',
      time: '3m ago',
      unread: true,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
    {
      id: 'n-2',
      title: 'New Paid Registration: BCS 46th Mock',
      time: '12m ago',
      unread: true,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
    {
      id: 'n-3',
      title: 'Hostinger MySQL Connection Capacity at 40%',
      time: '1h ago',
      unread: true,
      icon: AlertTriangle,
      color: 'text-amber-400',
    },
  ];

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="md:hidden h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        <nav className="flex items-center gap-1.5 text-xs text-slate-400">
          <span
            onClick={() => onNavigate('/admin/dashboard')}
            className="hover:text-slate-200 cursor-pointer font-medium"
          >
            QuizPlatform
          </span>
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1;
            const fullSubPath = '/' + pathParts.slice(0, index + 1).join('/');
            const formatted = part.charAt(0).toUpperCase() + part.slice(1);
            return (
              <React.Fragment key={part}>
                <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                <span
                  onClick={() => !isLast && onNavigate(fullSubPath)}
                  className={
                    isLast
                      ? "text-orange-400 font-semibold capitalize"
                      : "hover:text-slate-200 cursor-pointer capitalize"
                  }
                >
                  {formatted}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Actions, Search, Notifications, Profile */}
      <div className="flex items-center gap-2">
        {/* Search Input Bar */}
        <div className="relative hidden md:block w-52">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions, quizzes, users..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        {/* Dark/Light mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          className="h-8 w-8 text-slate-400 hover:text-slate-200"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications Popover */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="h-8 w-8 relative text-slate-400 hover:text-slate-200"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-white">Notifications</span>
                <span
                  onClick={() => setUnreadCount(0)}
                  className="text-[10px] text-orange-400 hover:underline cursor-pointer"
                >
                  Mark all as read
                </span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5"
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.color}`} />
                      <div className="flex-1 text-left leading-tight">
                        <div className="text-xs text-slate-200 font-medium">{n.title}</div>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-800/60 transition"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              RH
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-left animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="text-xs font-semibold text-white">Rakib Hasan</div>
                <div className="text-[10px] text-slate-400 truncate">rakib.edu.bd@gmail.com</div>
                <Badge variant="outline" className="mt-1 text-[9px] border-orange-500/40 text-orange-400">
                  Super Administrator
                </Badge>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate('/admin/settings');
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <Shield className="h-3.5 w-3.5" /> Platform Security & API
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate('/admin/audit-logs');
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Audit Trail
              </button>
              <div className="border-t border-slate-800 my-1" />
              <button
                onClick={() => setShowProfileMenu(false)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
