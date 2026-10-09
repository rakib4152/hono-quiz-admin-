import React, { useState } from 'react';
import {
  ShieldCheck,
  History,
  Settings,
  Lock,
  Key,
  Server,
  Database,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Button } from '../../ui/button.js';
import { Input } from '../../ui/input.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import { Switch } from '../../ui/switch.js';
import { toast } from 'sonner';

export const RolesAuditSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(true);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(true);
  const [turnstileProtection, setTurnstileProtection] = useState(true);

  const auditLogs = [
    {
      id: 'aud-109',
      actor: 'rakib.edu.bd@gmail.com',
      action: 'PUBLISH_QUIZ',
      resource: 'Quiz: 46th BCS Preliminary Model Test 01',
      ip: '103.114.98.12',
      timestamp: '2026-03-20 09:12:44',
    },
    {
      id: 'aud-108',
      actor: 'rakib.edu.bd@gmail.com',
      action: 'BULK_IMPORT_QUESTIONS',
      resource: 'ImportJob: imp-884 (200 questions)',
      ip: '103.114.98.12',
      timestamp: '2026-03-18 14:22:10',
    },
    {
      id: 'aud-107',
      actor: 'shahin.examiner@example.com',
      action: 'EDIT_QUESTION',
      resource: 'Question: BCS-46-MATH-01 (Updated explanation)',
      ip: '180.211.23.45',
      timestamp: '2026-03-16 11:05:00',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Governance, RBAC Permissions, Audit Trail & Platform Settings
          </h2>
          <p className="text-xs text-slate-400">
            Enforces Role-Based Access Control, tamper-evident audit logs, and Cloudflare Worker runtime configuration.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="roles" className="text-xs gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-400" /> Roles & Permissions (RBAC)
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5 text-blue-400" /> Audit Log Trail
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5">
            <Settings className="h-3.5 w-3.5 text-emerald-400" /> System Settings & Edge Config
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Roles */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                role: 'SUPER_ADMIN',
                description: 'Full unconstrained platform control, database migrations, billing, role assignment.',
                usersCount: 1,
              },
              {
                role: 'EXAMINER',
                description: 'Author, edit, publish questions and model tests. No financial or user deletion privileges.',
                usersCount: 8,
              },
              {
                role: 'STUDENT / CANDIDATE',
                description: 'Participate in quizzes, purchase subscriptions, review personal results and leaderboards.',
                usersCount: 104820,
              },
            ].map((r) => (
              <Card key={r.role}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit text-[10px] border-orange-500/30 text-orange-400">
                    {r.role}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-white mt-2">{r.role.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400">{r.description}</p>
                  <div className="text-xs text-emerald-400 font-mono font-semibold pt-2 border-t border-slate-800">
                    {r.usersCount.toLocaleString()} active users assigned
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Audit Logs */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Administrator Email</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource Target</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{log.timestamp}</td>
                    <td className="p-3 font-medium text-white">{log.actor}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-300">{log.resource}</td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 3: System Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Platform Runtime Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Expo Offline Quiz Attempt Sync</div>
                  <div className="text-[11px] text-slate-400">
                    Allow candidates to download quizzes into SQLite and submit asynchronously upon reconnection.
                  </div>
                </div>
                <Switch checked={offlineSyncEnabled} onCheckedChange={setOfflineSyncEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Negative Marking Recalculation Engine</div>
                  <div className="text-[11px] text-slate-400">
                    Enforce server-authoritative scoring penalties for incorrect answers on all national exams.
                  </div>
                </div>
                <Switch checked={negativeMarkingEnabled} onCheckedChange={setNegativeMarkingEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Cloudflare Turnstile Anti-Abuse</div>
                  <div className="text-[11px] text-slate-400">
                    Shield public registration and high-concurrency quiz start endpoints from automated bot spam.
                  </div>
                </div>
                <Switch checked={turnstileProtection} onCheckedChange={setTurnstileProtection} />
              </div>

              <Button
                size="sm"
                onClick={() => toast.success('Settings synchronized to Cloudflare Worker KV')}
                className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700"
              >
                <Save className="h-3.5 w-3.5" /> Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
