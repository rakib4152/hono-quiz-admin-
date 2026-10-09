import React from 'react';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  BarChart2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { AttemptDTO } from '../../../lib/api/client.js';
import { DataTable, ColumnDef } from '../tables/DataTable.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { toast } from 'sonner';

interface AttemptsResultsPageProps {
  attempts: AttemptDTO[];
}

export const AttemptsResultsPage: React.FC<AttemptsResultsPageProps> = ({ attempts }) => {
  const columns: ColumnDef<AttemptDTO>[] = [
    {
      key: 'id',
      header: 'Attempt ID',
      render: (row) => <span className="font-mono text-orange-400 font-bold">{row.id}</span>,
    },
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div>
          <div className="font-semibold text-white">{row.userEmail}</div>
          <div className="text-[11px] text-slate-400">{row.quizTitle}</div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score / Total',
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-emerald-400">{row.score}</span> / {row.totalMarks}
          <div className="text-[11px] text-slate-400 font-sans">({row.percentage}%)</div>
        </div>
      ),
    },
    {
      key: 'breakdown',
      header: 'Evaluation (Correct / Wrong / Skip)',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400">{row.correctCount} ✓</span>
          <span className="text-slate-500">•</span>
          <span className="text-rose-400">{row.incorrectCount} ✗</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{row.skippedCount} ↷</span>
        </div>
      ),
    },
    {
      key: 'timeTaken',
      header: 'Duration',
      render: (row) => (
        <span className="text-xs text-slate-300 font-mono">
          {Math.floor(row.timeTakenSeconds / 60)}m {row.timeTakenSeconds % 60}s
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Sync / Status',
      render: (row) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : 'outline'} className="text-[10px]">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info(`Viewing response paper for attempt ${row.id}`)}
          className="h-7 text-xs gap-1 border-slate-700"
        >
          <Eye className="h-3 w-3 text-orange-400" /> Audit Paper
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Quiz Attempts & Authoritative Results Audit
          </h2>
          <p className="text-xs text-slate-400">
            Server-side answer validation, negative mark recalculation, and offline synchronization audit logs.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={attempts}
        totalCount={attempts.length}
        searchPlaceholder="Search candidate email or quiz..."
      />
    </div>
  );
};
