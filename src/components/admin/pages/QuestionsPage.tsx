import React, { useState } from 'react';
import {
  Plus,
  Filter,
  FileSpreadsheet,
  Download,
  Copy,
  Trash2,
  Edit,
  Eye,
  Languages,
  CheckCircle,
} from 'lucide-react';
import { QuestionDTO } from '../../../lib/api/client.js';
import { DataTable, ColumnDef } from '../tables/DataTable.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { toast } from 'sonner';

interface QuestionsPageProps {
  questions: QuestionDTO[];
  onNewQuestion: () => void;
  onEditQuestion: (q: QuestionDTO) => void;
  onDeleteQuestion: (id: string) => void;
  onDuplicateQuestion: (q: QuestionDTO) => void;
  onNavigateToImports: () => void;
}

export const QuestionsPage: React.FC<QuestionsPageProps> = ({
  questions,
  onNewQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onNavigateToImports,
}) => {
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');

  // Filtered dataset
  const filtered = questions.filter((q) => {
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (filterSubject !== 'ALL' && q.subjectId !== filterSubject) return false;
    return true;
  });

  const columns: ColumnDef<QuestionDTO>[] = [
    {
      key: 'code',
      header: 'Code / ID',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-orange-400 font-semibold">{row.code}</span>
      ),
    },
    {
      key: 'title',
      header: 'Question Statement (English & বাংলা)',
      render: (row) => (
        <div className="space-y-0.5 max-w-md">
          <div className="font-medium text-white truncate">{row.titleEn}</div>
          <div className="text-slate-400 text-[11px] truncate">{row.titleBn}</div>
        </div>
      ),
    },
    {
      key: 'subjectName',
      header: 'Subject & Topic',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-slate-200 font-medium">{row.subjectName || 'Mathematics'}</div>
          <div className="text-slate-500 text-[11px]">{row.topicName || 'Algebra'}</div>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (row) => {
        const variant =
          row.difficulty === 'EASY'
            ? 'success'
            : row.difficulty === 'MEDIUM'
            ? 'warning'
            : 'destructive';
        return <Badge variant={variant as any}>{row.difficulty}</Badge>;
      },
    },
    {
      key: 'marks',
      header: 'Marks Policy',
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="text-emerald-400">+{row.positiveMarks}</span>
          <span className="text-slate-500 mx-1">/</span>
          <span className="text-rose-400">-{row.negativeMarks}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          variant={row.status === 'PUBLISHED' ? 'success' : 'outline'}
          className="text-[10px]"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEditQuestion(row)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Question"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDuplicateQuestion(row);
              toast.success(`Duplicated ${row.code}`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Question"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteQuestion(row.id);
              toast.error(`Question ${row.code} deleted`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const handleBulkDelete = (selected: QuestionDTO[]) => {
    selected.forEach((q) => onDeleteQuestion(q.id));
    toast.error(`Deleted ${selected.length} questions from database.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Question Bank Repository (12,450 questions)
          </h2>
          <p className="text-xs text-slate-400">
            Categorized multi-subject questions with dual English/Bangla text, answer options, and negative markings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToImports}
            className="h-8 gap-1.5 text-xs text-slate-300"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Import via CSV
          </Button>
          <Button
            size="sm"
            onClick={onNewQuestion}
            className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Question
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="h-3.5 w-3.5 text-orange-400" /> Filters:
        </div>

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="h-8 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-slate-200"
        >
          <option value="ALL">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="h-8 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-slate-200"
        >
          <option value="ALL">All Subjects</option>
          <option value="sub-1">Mathematics (গণিত)</option>
          <option value="sub-2">Bangla Literature (বাংলা)</option>
          <option value="sub-3">Biology (জীববিজ্ঞান)</option>
        </select>

        <div className="ml-auto text-xs text-slate-400 font-mono">
          Showing {filtered.length} questions
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filtered}
        totalCount={filtered.length}
        pageSize={10}
        searchPlaceholder="Search question text in English or বাংলা..."
        bulkActions={[
          {
            label: 'Delete Selected',
            action: handleBulkDelete,
            variant: 'destructive',
          },
        ]}
      />
    </div>
  );
};
