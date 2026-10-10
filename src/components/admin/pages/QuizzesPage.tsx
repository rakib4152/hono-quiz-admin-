import React, { useState } from 'react';
import {
  FileQuestion,
  Plus,
  Play,
  Calendar,
  Clock,
  DollarSign,
  Award,
  CheckCircle2,
  Trash2,
  Edit,
  Copy,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  Sparkles,
} from 'lucide-react';
import { QuizDTO, ExamDTO } from '../../../lib/api/client.js';
import { DataTable, ColumnDef } from '../tables/DataTable.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Input } from '../../ui/input.js';
import { Label } from '../../ui/label.js';
import { Switch } from '../../ui/switch.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog.js';
import { toast } from 'sonner';

interface QuizzesPageProps {
  quizzes: QuizDTO[];
  exams?: ExamDTO[];
  onAddQuiz: (quiz: QuizDTO) => void;
  onUpdateQuiz: (quiz: QuizDTO) => void;
  onDeleteQuiz: (id: string) => void;
  onDuplicateQuiz: (quiz: QuizDTO) => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({
  quizzes,
  exams = [],
  onAddQuiz,
  onUpdateQuiz,
  onDeleteQuiz,
  onDuplicateQuiz,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pricingFilter, setPricingFilter] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [slug, setSlug] = useState('');
  const [examId, setExamId] = useState('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passMarks, setPassMarks] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [totalQuestions, setTotalQuestions] = useState<number>(100);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [priceBdt, setPriceBdt] = useState<number>(100);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');

  // Filtered dataset
  const filtered = quizzes.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    if (pricingFilter === 'FREE' && q.isPaid) return false;
    if (pricingFilter === 'PAID' && !q.isPaid) return false;
    return true;
  });

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setTitleEn('');
    setTitleBn('');
    setSlug('');
    setExamId(exams.length > 0 ? exams[0].id : 'exam-1');
    setTotalMarks(100);
    setPassMarks(50);
    setDurationMinutes(60);
    setTotalQuestions(100);
    setIsPaid(false);
    setPriceBdt(0);
    setStatus('PUBLISHED');
    setModalOpen(true);
  };

  const handleOpenEditModal = (q: QuizDTO) => {
    setModalMode('edit');
    setEditingId(q.id);
    setTitleEn(q.titleEn);
    setTitleBn(q.titleBn);
    setSlug(q.slug);
    setExamId(q.examId);
    setTotalMarks(q.totalMarks);
    setPassMarks(q.passMarks);
    setDurationMinutes(q.durationMinutes);
    setTotalQuestions(q.totalQuestions);
    setIsPaid(q.isPaid);
    setPriceBdt(q.priceBdt);
    setStatus(q.status);
    setModalOpen(true);
  };

  const handleFillSample = () => {
    const timestamp = Date.now().toString().slice(-4);
    setTitleEn(`46th BCS Special Model Test ${timestamp}`);
    setTitleBn(`৪৬তম বিসিএস বিশেষ পূর্ণাঙ্গ মডেল টেস্ট ${timestamp}`);
    setSlug(`bcs-46-special-model-${timestamp}`);
    if (exams.length > 0) setExamId(exams[0].id);
    setTotalMarks(200);
    setPassMarks(100);
    setDurationMinutes(120);
    setTotalQuestions(200);
    setIsPaid(true);
    setPriceBdt(150);
    setStatus('PUBLISHED');
    toast.info('Sample quiz prefilled! Click "Save Quiz" to post.');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) {
      toast.error('Quiz title in English is required');
      return;
    }

    const selectedExam = exams.find((e) => e.id === examId);
    const examName = selectedExam ? selectedExam.nameEn : '46th BCS Preliminary';
    const computedBn = titleBn.trim() || titleEn;
    const computedSlug = slug.trim() || titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (modalMode === 'create') {
      const newQuiz: QuizDTO = {
        id: `quiz-${Date.now()}`,
        titleEn: titleEn.trim(),
        titleBn: computedBn,
        slug: computedSlug,
        examId: examId || 'exam-1',
        examName,
        totalMarks: Number(totalMarks) || 100,
        passMarks: Number(passMarks) || 50,
        durationMinutes: Number(durationMinutes) || 60,
        totalQuestions: Number(totalQuestions) || 100,
        isPaid: Boolean(isPaid),
        priceBdt: isPaid ? Number(priceBdt) || 0 : 0,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      };
      onAddQuiz(newQuiz);
      toast.success(`Quiz "${newQuiz.titleEn}" published successfully!`);
    } else if (editingId) {
      const existing = quizzes.find((q) => q.id === editingId);
      if (existing) {
        onUpdateQuiz({
          ...existing,
          titleEn: titleEn.trim(),
          titleBn: computedBn,
          slug: computedSlug,
          examId: examId || existing.examId,
          examName,
          totalMarks: Number(totalMarks) || existing.totalMarks,
          passMarks: Number(passMarks) || existing.passMarks,
          durationMinutes: Number(durationMinutes) || existing.durationMinutes,
          totalQuestions: Number(totalQuestions) || existing.totalQuestions,
          isPaid: Boolean(isPaid),
          priceBdt: isPaid ? Number(priceBdt) || 0 : 0,
          status,
        });
        toast.success(`Quiz "${titleEn}" updated!`);
      }
    }

    setModalOpen(false);
  };

  const columns: ColumnDef<QuizDTO>[] = [
    {
      key: 'titleEn',
      header: 'Quiz Title (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-sm">
          <div className="font-semibold text-white truncate">{row.titleEn}</div>
          <div className="text-slate-400 text-[11px] truncate">{row.titleBn}</div>
        </div>
      ),
    },
    {
      key: 'examName',
      header: 'Target Examination',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          {row.examName}
        </span>
      ),
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-200">
          {row.durationMinutes} mins
        </span>
      ),
    },
    {
      key: 'totalMarks',
      header: 'Marks & Passing',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="text-white font-semibold">{row.totalMarks}</span>
          <span className="text-slate-500 mx-1">/ Pass:</span>
          <span className="text-emerald-400 font-bold">{row.passMarks}</span>
        </div>
      ),
    },
    {
      key: 'totalQuestions',
      header: 'Questions',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-orange-400">
          {row.totalQuestions} MCQs
        </span>
      ),
    },
    {
      key: 'priceBdt',
      header: 'Access & Fee',
      sortable: true,
      render: (row) =>
        row.isPaid ? (
          <Badge variant="warning" className="text-[10px] font-mono">
            ৳ {row.priceBdt} BDT
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            Free Open
          </Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={row.status === 'PUBLISHED' ? 'success' : row.status === 'DRAFT' ? 'outline' : 'destructive'}
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
            onClick={() => handleOpenEditModal(row)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Quiz"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDuplicateQuiz(row);
              toast.success(`Duplicated "${row.titleEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Quiz"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteQuiz(row.id);
              toast.error(`Quiz "${row.titleEn}" deleted`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Quiz"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-orange-400" />
            Quiz & Examination Management ({quizzes.length} live)
          </h2>
          <p className="text-xs text-slate-400">
            Publish timed tests, configure pass marks, negative marking, and paid subscriptions in Bangladesh Taka.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition ${
                viewMode === 'table' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition ${
                viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 text-white font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Schedule New Quiz
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="h-3.5 w-3.5 text-orange-400" /> Filters:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-slate-200 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select
          value={pricingFilter}
          onChange={(e) => setPricingFilter(e.target.value)}
          className="h-8 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-slate-200 outline-none"
        >
          <option value="ALL">All Pricing (Free & Paid)</option>
          <option value="FREE">Free Quizzes Only</option>
          <option value="PAID">Paid Quizzes Only</option>
        </select>

        <div className="ml-auto text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-semibold">{filtered.length}</span> of {quizzes.length} quizzes
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filtered}
          totalCount={filtered.length}
          pageSize={10}
          searchPlaceholder="Search quizzes by title or examination..."
          bulkActions={[
            {
              label: 'Delete Selected',
              action: (selected) => {
                selected.forEach((q) => onDeleteQuiz(q.id));
                toast.error(`Deleted ${selected.length} quizzes`);
              },
              variant: 'destructive',
            },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col justify-between border-slate-800 bg-slate-900/90">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge
                    variant={quiz.status === 'PUBLISHED' ? 'success' : quiz.status === 'DRAFT' ? 'outline' : 'destructive'}
                    className="text-[10px]"
                  >
                    {quiz.status}
                  </Badge>
                  {quiz.isPaid ? (
                    <Badge variant="warning" className="text-[10px] font-mono">
                      ৳ {quiz.priceBdt} BDT
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Free Open
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-bold text-white leading-snug">
                  {quiz.titleEn}
                </CardTitle>
                <div className="text-xs text-slate-400 font-medium">{quiz.titleBn}</div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Marks</span>
                    <span className="font-bold text-white font-mono">{quiz.totalMarks} Marks</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Duration</span>
                    <span className="font-bold text-white font-mono">{quiz.durationMinutes} Mins</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Questions</span>
                    <span className="font-bold text-orange-400 font-mono">{quiz.totalQuestions} MCQs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Passing Score</span>
                    <span className="font-bold text-emerald-400 font-mono">{quiz.passMarks} Marks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] truncate max-w-[150px]">{quiz.examName}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(quiz)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      title="Edit Quiz"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDuplicateQuiz(quiz);
                        toast.success(`Duplicated ${quiz.titleEn}`);
                      }}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      title="Duplicate Quiz"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDeleteQuiz(quiz.id);
                        toast.error(`Quiz "${quiz.titleEn}" removed`);
                      }}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                      title="Delete Quiz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule / Edit Quiz Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSaveModal}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-orange-400" />
                {modalMode === 'create' ? 'Schedule New Timed Quiz' : 'Edit Quiz Settings'}
              </DialogTitle>
              {modalMode === 'create' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillSample}
                  className="h-7 text-[11px] gap-1 text-orange-400 border-orange-800/60 bg-orange-950/30 hover:bg-orange-900/40"
                >
                  <Sparkles className="h-3 w-3" /> Quick Sample
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Configure examination parameters, duration, pass thresholds, and pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Title EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Quiz Title (English) *</Label>
              <Input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. 46th BCS Preliminary Model Test 02"
                className="bg-slate-950 border-slate-700 text-xs"
                required
              />
            </div>

            {/* Title BN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300">Quiz Title (বাংলা)</Label>
                <button
                  type="button"
                  onClick={() => setTitleBn(titleEn)}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Copy English Title
                </button>
              </div>
              <Input
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                placeholder="৪৬তম বিসিএস প্রিলিমিনারি মডেল টেস্ট ০২"
                className="bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            {/* Target Exam & Slug */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parent Examination *</Label>
                <select
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  {exams.length > 0 ? (
                    exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.nameEn}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="exam-1">46th BCS Preliminary</option>
                      <option value="exam-2">Medical MBBS Admission 2026</option>
                      <option value="exam-3">Combined 8 Banks Officer Cash</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">URL Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="bcs-46-model-02"
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            {/* Numerical Quiz Properties */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Total Marks</Label>
                <Input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  min={10}
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Pass Marks</Label>
                <Input
                  type="number"
                  value={passMarks}
                  onChange={(e) => setPassMarks(Number(e.target.value))}
                  min={5}
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Duration (min)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={5}
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Total MCQs</Label>
                <Input
                  type="number"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  min={5}
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            {/* Paid Toggle & Price BDT */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Paid Premium Quiz</div>
                  <div className="text-[11px] text-slate-400">
                    Require candidate payment via SSLCommerz / aamarPay
                  </div>
                </div>
                <Switch checked={isPaid} onCheckedChange={setIsPaid} />
              </div>

              {isPaid && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] text-slate-300">Price in BDT (৳)</Label>
                    <Input
                      type="number"
                      value={priceBdt}
                      onChange={(e) => setPriceBdt(Number(e.target.value))}
                      min={10}
                      className="bg-slate-900 border-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono pt-4">
                    ৳ {priceBdt} BDT per candidate
                  </div>
                </div>
              )}
            </div>

            {/* Publication Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Publication Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
              >
                <option value="PUBLISHED">PUBLISHED (Live for students)</option>
                <option value="DRAFT">DRAFT (Hidden / Internal)</option>
                <option value="ARCHIVED">ARCHIVED (Read-only)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-medium"
            >
              {modalMode === 'create' ? 'Schedule & Publish Quiz' : 'Update Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
