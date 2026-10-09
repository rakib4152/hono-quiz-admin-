import React, { useState } from 'react';
import {
  Award,
  Trophy,
  Bell,
  Send,
  Zap,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/button.js';
import { Input } from '../../ui/input.js';
import { Textarea } from '../../ui/textarea.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import { toast } from 'sonner';

export const GamificationPage: React.FC = () => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const leaderboards = [
    { rank: 1, name: 'Nusrat Jahan', points: 14250, examsCount: 48, accuracy: '89.4%' },
    { rank: 2, name: 'Tanvir Ahmed', points: 12900, examsCount: 42, accuracy: '84.2%' },
    { rank: 3, name: 'Fahim Morshed', points: 11450, examsCount: 38, accuracy: '81.0%' },
    { rank: 4, name: 'Sadia Sultana', points: 9800, examsCount: 31, accuracy: '78.5%' },
  ];

  const badges = [
    { name: 'BCS Pioneer', criteria: 'Complete 10 BCS Mock tests', earnedBy: 2420, icon: '🎖️' },
    { name: 'Flawless Accuracy', criteria: 'Score 90%+ in a national exam', earnedBy: 840, icon: '🎯' },
    { name: '7-Day Streak', criteria: 'Take at least 1 quiz every day for a week', earnedBy: 4190, icon: '🔥' },
  ];

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Please enter title and message.');
      return;
    }
    toast.success(`Broadcast push sent to 104,829 candidates!`);
    setBroadcastTitle('');
    setBroadcastMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Candidate Leaderboards, Badges & Push Notifications
          </h2>
          <p className="text-xs text-slate-400">
            Real-time points calculation, streak badges, and broadcast announcements via Cloudflare Queues.
          </p>
        </div>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="leaderboard" className="text-xs gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> National Leaderboard
          </TabsTrigger>
          <TabsTrigger value="badges" className="text-xs gap-1.5">
            <Award className="h-3.5 w-3.5 text-orange-400" /> Badges & Achievements
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5 text-blue-400" /> Push Broadcast
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Total Merit Points</th>
                  <th className="p-3">Exams Completed</th>
                  <th className="p-3">Accuracy %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {leaderboards.map((lb) => (
                  <tr key={lb.rank} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-orange-400">#{lb.rank}</td>
                    <td className="p-3 font-semibold text-white">{lb.name}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">{lb.points.toLocaleString()} PTS</td>
                    <td className="p-3">{lb.examsCount}</td>
                    <td className="p-3 text-emerald-400 font-mono font-semibold">{lb.accuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Badges */}
        <TabsContent value="badges" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {badges.map((b) => (
              <Card key={b.name}>
                <CardContent className="p-4 space-y-2">
                  <div className="text-2xl">{b.icon}</div>
                  <div className="font-bold text-white text-sm">{b.name}</div>
                  <div className="text-xs text-slate-400">{b.criteria}</div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono">
                    Unlocked by {b.earnedBy.toLocaleString()} candidates
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Broadcast */}
        <TabsContent value="broadcast" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Broadcast Push Notification to All Active Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Notification Title</label>
                  <Input
                    placeholder="e.g. 46th BCS Full Length Model Test 01 is Live!"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Message Body</label>
                  <Textarea
                    placeholder="e.g. Join 5,000+ candidates in today's live examination. Live leaderboard closing at 10 PM."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button type="submit" size="sm" className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700">
                  <Send className="h-3.5 w-3.5" /> Dispatch Global Broadcast
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
