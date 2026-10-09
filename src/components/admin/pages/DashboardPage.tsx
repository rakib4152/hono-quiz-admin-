import React from 'react';
import {
  Users,
  FileQuestion,
  Receipt,
  TrendingUp,
  Activity,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { Badge } from '../../ui/badge.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

const hourlyTraffic = [
  { time: '06:00', takers: 420, answers: 2800 },
  { time: '08:00', takers: 980, answers: 7200 },
  { time: '10:00', takers: 2850, answers: 24100 },
  { time: '12:00', takers: 4920, answers: 42800 },
  { time: '14:00', takers: 5120, answers: 45900 },
  { time: '16:00', takers: 4310, answers: 38200 },
  { time: '18:00', takers: 3790, answers: 31000 },
  { time: '20:00', takers: 4620, answers: 40900 },
  { time: '22:00', takers: 3100, answers: 26500 },
];

const revenueData = [
  { day: 'Mon', revenue: 42000 },
  { day: 'Tue', revenue: 68000 },
  { day: 'Wed', revenue: 95000 },
  { day: 'Thu', revenue: 84000 },
  { day: 'Fri', revenue: 142000 },
  { day: 'Sat', revenue: 189000 },
  { day: 'Sun', revenue: 165000 },
];

export const DashboardPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner: Edge Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border border-orange-500/30 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Cloudflare Edge & Hyperdrive Operational</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400">
              5,120 concurrent quiz takers active • p95 read latency 18ms • Hostinger MySQL connection pool healthy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
            Hostinger Pool: 18/50 Conns
          </Badge>
          <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 text-xs">
            Hono Edge: Asia-South
          </Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Registered Candidates</CardTitle>
            <Users className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">104,829</div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+14.2% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Active Live Exam Takers</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">5,120</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <span>Target capacity: 5,000 peak</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Question Bank Volume</CardTitle>
            <FileQuestion className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">12,450</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <span>Bangla & English MCQ items</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Revenue (This Month)</CardTitle>
            <Receipt className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">৳ 785,000</div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>SSLCommerz & AamarPay</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Takers & Answers chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm">Real-Time Examination Concurrency & Answer Ingestion</CardTitle>
              <p className="text-xs text-slate-400">Active students vs. recorded answer submissions per hour</p>
            </div>
            <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30">
              Live Edge Metric
            </Badge>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTraffic}>
                <defs>
                  <linearGradient id="colorTakers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="takers" stroke="#f97316" fillOpacity={1} fill="url(#colorTakers)" name="Active Candidates" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Paid Quizzes & Subscriptions (BDT)</CardTitle>
            <p className="text-xs text-slate-400">Weekly checkout volume via SSL & AamarPay</p>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue ৳" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Submitted Exam Attempts</CardTitle>
              <p className="text-xs text-slate-400">Audited submissions verified by server-authoritative timer</p>
            </div>
            <button
              onClick={() => onNavigate('/admin/attempts')}
              className="text-xs text-orange-400 hover:underline font-semibold"
            >
              View all attempts →
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  id: 'att-1',
                  candidate: 'Nusrat Jahan',
                  quiz: '46th BCS Preliminary Model Test 01',
                  score: '154.25 / 200',
                  pct: '77.1%',
                  time: '1h 35m',
                  badge: 'success',
                },
                {
                  id: 'att-2',
                  candidate: 'Tanvir Ahmed',
                  quiz: '46th BCS Preliminary Model Test 01',
                  score: '138.50 / 200',
                  pct: '69.2%',
                  time: '1h 48m',
                  badge: 'default',
                },
                {
                  id: 'att-3',
                  candidate: 'Fahim Morshed',
                  quiz: 'Medical Admission Mock Exam 2026',
                  score: '82.00 / 100',
                  pct: '82.0%',
                  time: '52m',
                  badge: 'success',
                },
              ].map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">{att.candidate}</span>
                    <div className="text-slate-400 text-[11px]">{att.quiz}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-bold text-emerald-400">{att.score}</span>
                    <div className="text-[10px] text-slate-500">Duration: {att.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin Quick Action Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Administrative Actions</CardTitle>
            <p className="text-xs text-slate-400">Frequently used operations</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => onNavigate('/admin/questions/new')}
              className="w-full text-left p-3 rounded-lg bg-orange-600/10 border border-orange-500/30 hover:bg-orange-600/20 text-xs font-semibold text-orange-300 transition flex items-center justify-between"
            >
              <span>+ Create Bangla/English MCQ</span>
              <FileQuestion className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('/admin/imports')}
              className="w-full text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
            >
              <span>Upload Questions via CSV</span>
              <FileQuestion className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('/admin/quizzes')}
              className="w-full text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
            >
              <span>Schedule New Paid Live Quiz</span>
              <Award className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('/admin/payments')}
              className="w-full text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
            >
              <span>SSLCommerz Transaction Audit</span>
              <Receipt className="h-4 w-4 text-slate-400" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
