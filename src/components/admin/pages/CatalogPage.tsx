import React, { useState, useEffect } from 'react';
import {
  Layers,
  GraduationCap,
  BookOpen,
  BookmarkCheck,
  Plus,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  CheckCircle,
  FolderTree,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  CategoryDTO,
  ExamDTO,
  SubjectDTO,
  TopicDTO,
  ChapterDTO,
} from '../../../lib/api/client.js';
import { DataTable, ColumnDef } from '../tables/DataTable.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Input } from '../../ui/input.js';
import { Label } from '../../ui/label.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog.js';
import { toast } from 'sonner';

interface CatalogPageProps {
  currentPath?: string;
  categories: CategoryDTO[];
  exams: ExamDTO[];
  subjects: SubjectDTO[];
  topics: TopicDTO[];
  chapters: ChapterDTO[];
  onAddCategory: (item: CategoryDTO) => void;
  onUpdateCategory: (item: CategoryDTO) => void;
  onDeleteCategory: (id: string) => void;
  onAddExam: (item: ExamDTO) => void;
  onUpdateExam: (item: ExamDTO) => void;
  onDeleteExam: (id: string) => void;
  onAddSubject: (item: SubjectDTO) => void;
  onUpdateSubject: (item: SubjectDTO) => void;
  onDeleteSubject: (id: string) => void;
  onAddTopic: (item: TopicDTO) => void;
  onUpdateTopic: (item: TopicDTO) => void;
  onDeleteTopic: (id: string) => void;
  onAddChapter: (item: ChapterDTO) => void;
  onUpdateChapter: (item: ChapterDTO) => void;
  onDeleteChapter: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  isLiveConnected?: boolean;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  currentPath = '/admin/categories',
  categories,
  exams,
  subjects,
  topics,
  chapters,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  isLoading = false,
  error = null,
  onRefresh,
  isLiveConnected = false,
}) => {
  // Sync tab with URL
  const determineTab = (path: string) => {
    if (path.includes('exams')) return 'exams';
    if (path.includes('subjects')) return 'subjects';
    if (path.includes('topics')) return 'topics';
    if (path.includes('chapters')) return 'chapters';
    return 'categories';
  };

  const [activeTab, setActiveTab] = useState<string>(determineTab(currentPath));

  useEffect(() => {
    setActiveTab(determineTab(currentPath));
  }, [currentPath]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalType, setModalType] = useState<'category' | 'exam' | 'subject' | 'topic' | 'chapter'>('category');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [codeOrSlug, setCodeOrSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [marksWeightage, setMarksWeightage] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Trigger modal for Create
  const handleOpenCreateModal = (type?: 'category' | 'exam' | 'subject' | 'topic' | 'chapter') => {
    const targetType = type || (activeTab === 'categories' ? 'category' : activeTab === 'exams' ? 'exam' : activeTab === 'subjects' ? 'subject' : activeTab === 'topics' ? 'topic' : 'chapter');
    setModalType(targetType);
    setModalMode('create');
    setEditingId(null);
    setNameEn('');
    setNameBn('');
    setCodeOrSlug('');
    setDescription('');
    setStatus('ACTIVE');

    if (targetType === 'exam' && categories.length > 0) setParentId(categories[0].id);
    else if (targetType === 'subject' && exams.length > 0) setParentId(exams[0].id);
    else if (targetType === 'topic' && subjects.length > 0) setParentId(subjects[0].id);
    else if (targetType === 'chapter' && topics.length > 0) setParentId(topics[0].id);
    else setParentId('');

    setModalOpen(true);
  };

  // Quick fill sample for immediate testing
  const handleFillSample = () => {
    const timestamp = Date.now().toString().slice(-4);
    if (modalType === 'category') {
      setNameEn(`Skill Development & Certifications ${timestamp}`);
      setNameBn(`দক্ষতা উন্নয়ন ও পেশাদার কোর্স ${timestamp}`);
      setCodeOrSlug(`skill-cert-${timestamp}`);
      setDescription('Professional certifications, IT skills, and specialized recruitment tests');
    } else if (modalType === 'exam') {
      setNameEn(`Bangladesh Bank Assistant Director ${timestamp}`);
      setNameBn(`বাংলাদেশ ব্যাংক সহকারী পরিচালক প্রিলিমিনারি ${timestamp}`);
      setCodeOrSlug(`BB-AD-${timestamp}`);
      if (categories.length > 0) setParentId(categories[0].id);
    } else if (modalType === 'subject') {
      setNameEn(`ICT & Computer Science ${timestamp}`);
      setNameBn(`তথ্য ও যোগাযোগ প্রযুক্তি ${timestamp}`);
      setCodeOrSlug(`ICT-SUB-${timestamp}`);
      setMarksWeightage(25);
      if (exams.length > 0) setParentId(exams[0].id);
    } else if (modalType === 'topic') {
      setNameEn(`Database Systems & SQL Queries ${timestamp}`);
      setNameBn(`ডাটাবেজ সিস্টেম ও এসকিউএল কুয়েরি ${timestamp}`);
      setCodeOrSlug(`TOP-SQL-${timestamp}`);
      if (subjects.length > 0) setParentId(subjects[0].id);
    } else if (modalType === 'chapter') {
      setNameEn(`Relational Joins & Transactions ${timestamp}`);
      setNameBn(`রিলেশনাল জয়েন ও ডাটাবেজ ট্রানজেকশন ${timestamp}`);
      setCodeOrSlug(`CHAP-JOIN-${timestamp}`);
      if (topics.length > 0) setParentId(topics[0].id);
    }
    toast.info('Sample entity prefilled! Click "Save & Commit" to post.');
  };

  // Submit Handler for Create / Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      toast.error('English name is required');
      return;
    }

    const currentBn = nameBn.trim() || nameEn;

    if (modalType === 'category') {
      if (modalMode === 'create') {
        const newCat: CategoryDTO = {
          id: `cat-${Date.now()}`,
          nameEn: nameEn.trim(),
          nameBn: currentBn,
          slug: codeOrSlug.trim() || nameEn.toLowerCase().replace(/\s+/g, '-'),
          description: description.trim() || undefined,
          examsCount: 0,
          status,
          createdAt: new Date().toISOString(),
        };
        onAddCategory(newCat);
        toast.success(`Category "${newCat.nameEn}" successfully posted!`);
      } else if (editingId) {
        const existing = categories.find((c) => c.id === editingId);
        if (existing) {
          onUpdateCategory({
            ...existing,
            nameEn: nameEn.trim(),
            nameBn: currentBn,
            slug: codeOrSlug.trim() || existing.slug,
            description: description.trim() || existing.description,
            status,
          });
          toast.success(`Category "${nameEn}" updated!`);
        }
      }
    } else if (modalType === 'exam') {
      const parentCat = categories.find((c) => c.id === parentId) || categories[0];
      if (modalMode === 'create') {
        const newExam: ExamDTO = {
          id: `exam-${Date.now()}`,
          categoryId: parentCat?.id || 'cat-1',
          categoryName: parentCat?.nameEn || 'General Category',
          nameEn: nameEn.trim(),
          nameBn: currentBn,
          code: codeOrSlug.trim() || `EXAM-${Date.now().toString().slice(-4)}`,
          totalMarks: 100,
          durationMinutes: 60,
          quizzesCount: 0,
          subjectsCount: 0,
          status,
          createdAt: new Date().toISOString(),
        };
        onAddExam(newExam);
        toast.success(`Exam "${newExam.nameEn}" successfully posted!`);
      } else if (editingId) {
        const existing = exams.find((e) => e.id === editingId);
        if (existing) {
          onUpdateExam({
            ...existing,
            categoryId: parentCat?.id || existing.categoryId,
            categoryName: parentCat?.nameEn || existing.categoryName,
            nameEn: nameEn.trim(),
            nameBn: currentBn,
            code: codeOrSlug.trim() || existing.code,
            status,
          });
          toast.success(`Exam "${nameEn}" updated!`);
        }
      }
    } else if (modalType === 'subject') {
      const parentExam = exams.find((e) => e.id === parentId) || exams[0];
      if (modalMode === 'create') {
        const newSub: SubjectDTO = {
          id: `sub-${Date.now()}`,
          examId: parentExam?.id || 'exam-1',
          examName: parentExam?.nameEn || 'General Exam',
          nameEn: nameEn.trim(),
          nameBn: currentBn,
          code: codeOrSlug.trim() || `SUB-${Date.now().toString().slice(-4)}`,
          marksWeightage: Number(marksWeightage) || 30,
          topicsCount: 0,
          status,
          createdAt: new Date().toISOString(),
        };
        onAddSubject(newSub);
        toast.success(`Subject "${newSub.nameEn}" successfully posted!`);
      } else if (editingId) {
        const existing = subjects.find((s) => s.id === editingId);
        if (existing) {
          onUpdateSubject({
            ...existing,
            examId: parentExam?.id || existing.examId,
            examName: parentExam?.nameEn || existing.examName,
            nameEn: nameEn.trim(),
            nameBn: currentBn,
            code: codeOrSlug.trim() || existing.code,
            marksWeightage: Number(marksWeightage) || existing.marksWeightage,
            status,
          });
          toast.success(`Subject "${nameEn}" updated!`);
        }
      }
    } else if (modalType === 'topic') {
      const parentSubject = subjects.find((s) => s.id === parentId) || subjects[0];
      if (modalMode === 'create') {
        const newTopic: TopicDTO = {
          id: `top-${Date.now()}`,
          subjectId: parentSubject?.id || 'sub-1',
          subjectName: parentSubject?.nameEn || 'General Subject',
          nameEn: nameEn.trim(),
          nameBn: currentBn,
          code: codeOrSlug.trim() || `TOP-${Date.now().toString().slice(-4)}`,
          chaptersCount: 0,
          questionsCount: 0,
          status,
          createdAt: new Date().toISOString(),
        };
        onAddTopic(newTopic);
        toast.success(`Topic "${newTopic.nameEn}" successfully posted!`);
      } else if (editingId) {
        const existing = topics.find((t) => t.id === editingId);
        if (existing) {
          onUpdateTopic({
            ...existing,
            subjectId: parentSubject?.id || existing.subjectId,
            subjectName: parentSubject?.nameEn || existing.subjectName,
            nameEn: nameEn.trim(),
            nameBn: currentBn,
            code: codeOrSlug.trim() || existing.code,
            status,
          });
          toast.success(`Topic "${nameEn}" updated!`);
        }
      }
    } else if (modalType === 'chapter') {
      const parentTopic = topics.find((t) => t.id === parentId) || topics[0];
      if (modalMode === 'create') {
        const newChap: ChapterDTO = {
          id: `chap-${Date.now()}`,
          topicId: parentTopic?.id || 'top-1',
          topicName: parentTopic?.nameEn || 'General Topic',
          subjectName: parentTopic?.subjectName || 'General Subject',
          nameEn: nameEn.trim(),
          nameBn: currentBn,
          code: codeOrSlug.trim() || `CHAP-${Date.now().toString().slice(-4)}`,
          questionsCount: 0,
          status,
          createdAt: new Date().toISOString(),
        };
        onAddChapter(newChap);
        toast.success(`Chapter "${newChap.nameEn}" successfully posted!`);
      } else if (editingId) {
        const existing = chapters.find((c) => c.id === editingId);
        if (existing) {
          onUpdateChapter({
            ...existing,
            topicId: parentTopic?.id || existing.topicId,
            topicName: parentTopic?.nameEn || existing.topicName,
            subjectName: parentTopic?.subjectName || existing.subjectName,
            nameEn: nameEn.trim(),
            nameBn: currentBn,
            code: codeOrSlug.trim() || existing.code,
            status,
          });
          toast.success(`Chapter "${nameEn}" updated!`);
        }
      }
    }

    setModalOpen(false);
  };

  // 1. Categories Columns Definition
  const categoryColumns: ColumnDef<CategoryDTO>[] = [
    {
      key: 'nameEn',
      header: 'Category Name (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.nameEn}</div>
          <div className="text-slate-400 text-[11px]">{row.nameBn}</div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug / URL Identifier',
      sortable: true,
      render: (row) => <span className="font-mono text-orange-400 text-xs">/{row.slug}</span>,
    },
    {
      key: 'examsCount',
      header: 'Connected Exams',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.examsCount} Exams
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
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
            onClick={() => {
              setModalType('category');
              setModalMode('edit');
              setEditingId(row.id);
              setNameEn(row.nameEn);
              setNameBn(row.nameBn);
              setCodeOrSlug(row.slug);
              setDescription(row.description || '');
              setStatus(row.status);
              setModalOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Category"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy: CategoryDTO = {
                ...row,
                id: `cat-${Date.now()}`,
                nameEn: `${row.nameEn} (Copy)`,
                nameBn: `${row.nameBn} (কপি)`,
                slug: `${row.slug}-copy`,
                createdAt: new Date().toISOString(),
              };
              onAddCategory(copy);
              toast.success(`Duplicated category "${copy.nameEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Category"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteCategory(row.id);
              toast.error(`Category "${row.nameEn}" removed`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Category"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // 2. Exams Columns Definition
  const examColumns: ColumnDef<ExamDTO>[] = [
    {
      key: 'nameEn',
      header: 'Exam Title (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.nameEn}</div>
          <div className="text-slate-400 text-[11px]">{row.nameBn}</div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-orange-400 text-xs bg-orange-950/40 px-2 py-0.5 rounded border border-orange-800/30">
          {row.categoryName}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Exam Code',
      sortable: true,
      render: (row) => <span className="font-mono text-slate-300 text-xs font-semibold">{row.code}</span>,
    },
    {
      key: 'quizzesCount',
      header: 'Quizzes / Tests',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs font-mono text-emerald-400">
          {row.quizzesCount} Quizzes
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
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
            onClick={() => {
              setModalType('exam');
              setModalMode('edit');
              setEditingId(row.id);
              setNameEn(row.nameEn);
              setNameBn(row.nameBn);
              setCodeOrSlug(row.code);
              setParentId(row.categoryId);
              setStatus(row.status);
              setModalOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Exam"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy: ExamDTO = {
                ...row,
                id: `exam-${Date.now()}`,
                nameEn: `${row.nameEn} (Copy)`,
                nameBn: `${row.nameBn} (কপি)`,
                code: `${row.code}-COPY`,
                createdAt: new Date().toISOString(),
              };
              onAddExam(copy);
              toast.success(`Duplicated exam "${copy.nameEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Exam"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteExam(row.id);
              toast.error(`Exam "${row.nameEn}" removed`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Exam"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // 3. Subjects Columns Definition
  const subjectColumns: ColumnDef<SubjectDTO>[] = [
    {
      key: 'nameEn',
      header: 'Subject (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.nameEn}</div>
          <div className="text-slate-400 text-[11px]">{row.nameBn}</div>
        </div>
      ),
    },
    {
      key: 'examName',
      header: 'Target Examination',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-300 text-xs">{row.examName}</span>,
    },
    {
      key: 'marksWeightage',
      header: 'Marks Weightage',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded border border-orange-800/40">
          {row.marksWeightage} Marks
        </span>
      ),
    },
    {
      key: 'topicsCount',
      header: 'Topics',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.topicsCount} Topics
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
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
            onClick={() => {
              setModalType('subject');
              setModalMode('edit');
              setEditingId(row.id);
              setNameEn(row.nameEn);
              setNameBn(row.nameBn);
              setCodeOrSlug(row.code);
              setParentId(row.examId);
              setMarksWeightage(row.marksWeightage);
              setStatus(row.status);
              setModalOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Subject"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy: SubjectDTO = {
                ...row,
                id: `sub-${Date.now()}`,
                nameEn: `${row.nameEn} (Copy)`,
                nameBn: `${row.nameBn} (কপি)`,
                code: `${row.code}-COPY`,
                createdAt: new Date().toISOString(),
              };
              onAddSubject(copy);
              toast.success(`Duplicated subject "${copy.nameEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Subject"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteSubject(row.id);
              toast.error(`Subject "${row.nameEn}" removed`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Subject"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // 4. Topics Columns Definition
  const topicColumns: ColumnDef<TopicDTO>[] = [
    {
      key: 'nameEn',
      header: 'Topic (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.nameEn}</div>
          <div className="text-slate-400 text-[11px]">{row.nameBn}</div>
        </div>
      ),
    },
    {
      key: 'subjectName',
      header: 'Parent Subject',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-300 font-medium">{row.subjectName}</span>,
    },
    {
      key: 'chaptersCount',
      header: 'Chapters',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.chaptersCount} Chapters
        </Badge>
      ),
    },
    {
      key: 'questionsCount',
      header: 'Question Bank',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-orange-400 font-semibold">
          {row.questionsCount} MCQs
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
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
            onClick={() => {
              setModalType('topic');
              setModalMode('edit');
              setEditingId(row.id);
              setNameEn(row.nameEn);
              setNameBn(row.nameBn);
              setCodeOrSlug(row.code);
              setParentId(row.subjectId);
              setStatus(row.status);
              setModalOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Topic"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy: TopicDTO = {
                ...row,
                id: `top-${Date.now()}`,
                nameEn: `${row.nameEn} (Copy)`,
                nameBn: `${row.nameBn} (কপি)`,
                code: `${row.code}-COPY`,
                createdAt: new Date().toISOString(),
              };
              onAddTopic(copy);
              toast.success(`Duplicated topic "${copy.nameEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Topic"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteTopic(row.id);
              toast.error(`Topic "${row.nameEn}" removed`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Topic"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // 5. Chapters Columns Definition
  const chapterColumns: ColumnDef<ChapterDTO>[] = [
    {
      key: 'nameEn',
      header: 'Chapter (English & বাংলা)',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.nameEn}</div>
          <div className="text-slate-400 text-[11px]">{row.nameBn}</div>
        </div>
      ),
    },
    {
      key: 'topicName',
      header: 'Topic & Subject',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-xs text-white font-medium">{row.topicName}</div>
          <div className="text-[11px] text-slate-500">{row.subjectName}</div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Chapter Code',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-300 font-semibold">{row.code}</span>,
    },
    {
      key: 'questionsCount',
      header: 'Question Bank',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-emerald-400 font-bold">
          {row.questionsCount} MCQs
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
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
            onClick={() => {
              setModalType('chapter');
              setModalMode('edit');
              setEditingId(row.id);
              setNameEn(row.nameEn);
              setNameBn(row.nameBn);
              setCodeOrSlug(row.code);
              setParentId(row.topicId);
              setStatus(row.status);
              setModalOpen(true);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Edit Chapter"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy: ChapterDTO = {
                ...row,
                id: `chap-${Date.now()}`,
                nameEn: `${row.nameEn} (Copy)`,
                nameBn: `${row.nameBn} (কপি)`,
                code: `${row.code}-COPY`,
                createdAt: new Date().toISOString(),
              };
              onAddChapter(copy);
              toast.success(`Duplicated chapter "${copy.nameEn}"`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Duplicate Chapter"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onDeleteChapter(row.id);
              toast.error(`Chapter "${row.nameEn}" removed`);
            }}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
            title="Delete Chapter"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header with Add Item Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-orange-400" />
            Curriculum Catalog & Academic Hierarchy
          </h2>
          <p className="text-xs text-slate-400">
            5-tier structure: Category → Exam → Subject → Topic → Chapter with full pagination, search & editing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
              Refresh
            </Button>
          )}

          <Badge
            variant={isLiveConnected ? 'success' : 'outline'}
            className="text-[11px] h-7 px-2.5 font-medium flex items-center gap-1.5"
          >
            <span className={`h-2 w-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isLiveConnected ? 'Live Hono API' : 'Local Fallback'}
          </Badge>

          <Button
            size="sm"
            onClick={() => handleOpenCreateModal()}
            className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 text-white font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New {activeTab === 'categories' ? 'Category' : activeTab === 'exams' ? 'Exam' : activeTab === 'subjects' ? 'Subject' : activeTab === 'topics' ? 'Topic' : 'Chapter'}
          </Button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-center justify-between gap-3 text-rose-200">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold text-rose-300">API Synchronization Warning:</span> {error}
            </div>
          </div>
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="h-7 text-xs border-rose-700 bg-rose-900/30 text-rose-200 hover:bg-rose-900/50"
            >
              Retry Sync
            </Button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
          <div className="text-xs text-slate-400">Loading catalog from Hono / Cloudflare backend...</div>
        </div>
      )}

      {/* Tabs for all 5 tiers */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto p-1">
          <TabsTrigger value="categories" className="gap-1.5 text-xs py-1.5 px-3">
            <Layers className="h-3.5 w-3.5 text-orange-400" /> 1. Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-1.5 text-xs py-1.5 px-3">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" /> 2. Exams ({exams.length})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5 text-xs py-1.5 px-3">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> 3. Subjects ({subjects.length})
          </TabsTrigger>
          <TabsTrigger value="topics" className="gap-1.5 text-xs py-1.5 px-3">
            <BookmarkCheck className="h-3.5 w-3.5 text-sky-400" /> 4. Topics ({topics.length})
          </TabsTrigger>
          <TabsTrigger value="chapters" className="gap-1.5 text-xs py-1.5 px-3">
            <FolderTree className="h-3.5 w-3.5 text-purple-400" /> 5. Chapters ({chapters.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Categories Table */}
        <TabsContent value="categories" className="space-y-4 pt-2">
          <DataTable
            columns={categoryColumns}
            data={categories}
            totalCount={categories.length}
            pageSize={10}
            searchPlaceholder="Search categories by name, slug or description..."
            bulkActions={[
              {
                label: 'Delete Selected',
                action: (selected) => {
                  selected.forEach((c) => onDeleteCategory(c.id));
                  toast.error(`Removed ${selected.length} categories`);
                },
                variant: 'destructive',
              },
            ]}
          />
        </TabsContent>

        {/* Tab 2: Exams Table */}
        <TabsContent value="exams" className="space-y-4 pt-2">
          <DataTable
            columns={examColumns}
            data={exams}
            totalCount={exams.length}
            pageSize={10}
            searchPlaceholder="Search exams by name, code or category..."
            bulkActions={[
              {
                label: 'Delete Selected',
                action: (selected) => {
                  selected.forEach((e) => onDeleteExam(e.id));
                  toast.error(`Removed ${selected.length} exams`);
                },
                variant: 'destructive',
              },
            ]}
          />
        </TabsContent>

        {/* Tab 3: Subjects Table */}
        <TabsContent value="subjects" className="space-y-4 pt-2">
          <DataTable
            columns={subjectColumns}
            data={subjects}
            totalCount={subjects.length}
            pageSize={10}
            searchPlaceholder="Search subjects by name, exam or code..."
            bulkActions={[
              {
                label: 'Delete Selected',
                action: (selected) => {
                  selected.forEach((s) => onDeleteSubject(s.id));
                  toast.error(`Removed ${selected.length} subjects`);
                },
                variant: 'destructive',
              },
            ]}
          />
        </TabsContent>

        {/* Tab 4: Topics Table */}
        <TabsContent value="topics" className="space-y-4 pt-2">
          <DataTable
            columns={topicColumns}
            data={topics}
            totalCount={topics.length}
            pageSize={10}
            searchPlaceholder="Search topics by title, subject or code..."
            bulkActions={[
              {
                label: 'Delete Selected',
                action: (selected) => {
                  selected.forEach((t) => onDeleteTopic(t.id));
                  toast.error(`Removed ${selected.length} topics`);
                },
                variant: 'destructive',
              },
            ]}
          />
        </TabsContent>

        {/* Tab 5: Chapters Table */}
        <TabsContent value="chapters" className="space-y-4 pt-2">
          <DataTable
            columns={chapterColumns}
            data={chapters}
            totalCount={chapters.length}
            pageSize={10}
            searchPlaceholder="Search chapters by title, topic or code..."
            bulkActions={[
              {
                label: 'Delete Selected',
                action: (selected) => {
                  selected.forEach((c) => onDeleteChapter(c.id));
                  toast.error(`Removed ${selected.length} chapters`);
                },
                variant: 'destructive',
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Interactive Entity Creation / Edit Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSaveModal}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-400" />
                {modalMode === 'create' ? `Post New ${modalType.toUpperCase()}` : `Edit ${modalType.toUpperCase()}`}
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
              Save this academic record into the live MySQL curriculum catalog with bilingual support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Entity Type Selector (if create mode) */}
            {modalMode === 'create' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Hierarchy Level</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['category', 'exam', 'subject', 'topic', 'chapter'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setModalType(t);
                        if (t === 'exam' && categories.length > 0) setParentId(categories[0].id);
                        if (t === 'subject' && exams.length > 0) setParentId(exams[0].id);
                        if (t === 'topic' && subjects.length > 0) setParentId(subjects[0].id);
                        if (t === 'chapter' && topics.length > 0) setParentId(topics[0].id);
                      }}
                      className={`py-1 px-2 rounded text-[11px] capitalize font-medium transition ${
                        modalType === t
                          ? 'bg-orange-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Parent Dropdown */}
            {modalType === 'exam' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parent Category *</Label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} ({c.nameBn})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modalType === 'subject' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parent Examination *</Label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.nameEn} [{ex.categoryName}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modalType === 'topic' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parent Subject *</Label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} [{s.examName}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modalType === 'chapter' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parent Topic *</Label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameEn} [{t.subjectName}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title / Name EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Name (English) *</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={`e.g. ${
                  modalType === 'category'
                    ? 'Engineering Admission'
                    : modalType === 'exam'
                    ? '46th BCS Preliminary'
                    : modalType === 'subject'
                    ? 'Mathematics & Logic'
                    : modalType === 'topic'
                    ? 'Algebraic Formulas'
                    : 'Quadratic Equations'
                }`}
                className="bg-slate-950 border-slate-700 text-xs"
                required
              />
            </div>

            {/* Title / Name BN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300">Name (বাংলা)</Label>
                <button
                  type="button"
                  onClick={() => setNameBn(nameEn)}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Copy English Name
                </button>
              </div>
              <Input
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="বাংলা নাম লিখুন (ঐচ্ছিক)"
                className="bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            {/* Code / Slug */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  {modalType === 'category' ? 'URL Slug' : 'Code / Identifier'}
                </Label>
                <Input
                  value={codeOrSlug}
                  onChange={(e) => setCodeOrSlug(e.target.value)}
                  placeholder={modalType === 'category' ? 'job-prep' : 'BCS-MATH-01'}
                  className="bg-slate-950 border-slate-700 text-xs font-mono"
                />
              </div>

              {modalType === 'subject' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Marks Weightage</Label>
                  <Input
                    type="number"
                    value={marksWeightage}
                    onChange={(e) => setMarksWeightage(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="bg-slate-950 border-slate-700 text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
            </div>

            {/* Description (for Category) */}
            {modalType === 'category' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief curriculum description..."
                  className="bg-slate-950 border-slate-700 text-xs"
                />
              </div>
            )}
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
              {modalMode === 'create' ? 'Save & Commit Record' : 'Update Record'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
