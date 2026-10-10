import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  Eye,
  Plus,
  Trash2,
  Check,
  Languages,
  Image as ImageIcon,
  ArrowLeft,
  Copy,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { QuestionFormSchema, QuestionFormValues } from '../../../lib/validations/question.js';
import { QuestionDTO } from '../../../lib/api/client.js';
import { Button } from '../../ui/button.js';
import { Input } from '../../ui/input.js';
import { Textarea } from '../../ui/textarea.js';
import { Label } from '../../ui/label.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog.js';
import { toast } from 'sonner';

interface QuestionEditorProps {
  initialData?: QuestionDTO | null;
  onSave: (data: QuestionDTO) => void;
  onCancel: () => void;
  onDuplicate?: (data: QuestionDTO) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  onDuplicate,
}) => {
  const [langTab, setLangTab] = useState<'both' | 'en' | 'bn'>('both');
  const [previewOpen, setPreviewOpen] = useState(false);

  const defaultValues: QuestionFormValues = {
    code: initialData?.code || `BCS-46-M-${Math.floor(10 + Math.random() * 90)}`,
    type: initialData?.type || 'MCQ_SINGLE',
    titleEn: initialData?.titleEn || '',
    titleBn: initialData?.titleBn || '',
    categoryId: initialData?.categoryId || 'cat-1',
    examId: initialData?.examId || 'exam-1',
    subjectId: initialData?.subjectId || 'sub-1',
    topicId: initialData?.topicId || 'top-1',
    chapterId: initialData?.chapterId || 'chap-1',
    difficulty: initialData?.difficulty || 'MEDIUM',
    positiveMarks: initialData?.positiveMarks || 1.0,
    negativeMarks: initialData?.negativeMarks || 0.25,
    status: initialData?.status || 'PUBLISHED',
    options: initialData?.options || [
      { id: 'opt-1', textEn: '', textBn: '', isCorrect: true },
      { id: 'opt-2', textEn: '', textBn: '', isCorrect: false },
      { id: 'opt-3', textEn: '', textBn: '', isCorrect: false },
      { id: 'opt-4', textEn: '', textBn: '', isCorrect: false },
    ],
    explanationEn: initialData?.explanationEn || '',
    explanationBn: initialData?.explanationBn || '',
    tags: initialData?.tags?.join(', ') || 'BCS, Mathematics',
    imageUrl: initialData?.imageUrl || '',
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(QuestionFormSchema) as any,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  const watchedType = watch('type');
  const watchedOptions = watch('options');
  const watchedTitleEn = watch('titleEn');
  const watchedTitleBn = watch('titleBn');
  const watchedExpEn = watch('explanationEn');
  const watchedExpBn = watch('explanationBn');
  const watchedMarks = watch('positiveMarks');
  const watchedNegMarks = watch('negativeMarks');

  const handleCorrectOptionToggle = (index: number) => {
    if (watchedType === 'MCQ_SINGLE' || watchedType === 'TRUE_FALSE') {
      const updated = watchedOptions.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setValue('options', updated, { shouldValidate: true });
    } else {
      const current = watchedOptions[index]?.isCorrect;
      setValue(`options.${index}.isCorrect`, !current, { shouldValidate: true });
    }
  };

  const handleFillSample = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    setValue('code', `BCS-46-MATH-${rand}`);
    setValue('titleEn', 'What is the sum of internal angles of a hexagon?');
    setValue('titleBn', 'একটি সুষম ষড়ভুজের অন্তঃকোণগুলোর সমষ্টি কত?');
    setValue('type', 'MCQ_SINGLE');
    setValue('categoryId', 'cat-1');
    setValue('examId', 'exam-1');
    setValue('subjectId', 'sub-1');
    setValue('topicId', 'top-1');
    setValue('chapterId', 'chap-1');
    setValue('difficulty', 'MEDIUM');
    setValue('positiveMarks', 1.0);
    setValue('negativeMarks', 0.25);
    setValue('status', 'PUBLISHED');
    setValue('options', [
      { id: 'opt-1', textEn: '720°', textBn: '৭২০°', isCorrect: true },
      { id: 'opt-2', textEn: '540°', textBn: '৫৪০°', isCorrect: false },
      { id: 'opt-3', textEn: '360°', textBn: '৩৬০°', isCorrect: false },
      { id: 'opt-4', textEn: '900°', textBn: '৯০০°', isCorrect: false },
    ]);
    setValue('explanationEn', 'Formula: (n - 2) * 180° = (6 - 2) * 180° = 4 * 180° = 720°.');
    setValue('explanationBn', 'সূত্র: (n - ২) × ১৮০° = (৬ - ২) × ১৮০° = ৭২০°।');
    setValue('tags', 'Geometry, Hexagon, BCS-46');
    toast.success('Sample question populated! Click "Save Question" to save.');
  };

  const onError = (formErrors: any) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstErr = formErrors[errorKeys[0]];
      const msg = firstErr?.message || `Please check field: ${errorKeys[0]}`;
      toast.error(`Validation Error: ${msg}`);
    }
  };

  const onSubmit = (formData: QuestionFormValues) => {
    const parsedTags = (formData.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const safeBn = formData.titleBn?.trim() || formData.titleEn;

    const fullQuestion: QuestionDTO = {
      id: initialData?.id || `q-${Date.now()}`,
      code: formData.code,
      type: formData.type,
      titleEn: formData.titleEn,
      titleBn: safeBn,
      categoryId: formData.categoryId,
      examId: formData.examId,
      subjectId: formData.subjectId,
      topicId: formData.topicId,
      chapterId: formData.chapterId,
      categoryName: 'Job Preparation',
      subjectName: 'Mathematics',
      topicName: 'Algebra',
      difficulty: formData.difficulty,
      positiveMarks: formData.positiveMarks,
      negativeMarks: formData.negativeMarks,
      status: formData.status,
      options: formData.options.map((opt) => ({
        ...opt,
        textBn: opt.textBn?.trim() || opt.textEn,
      })),
      explanationEn: formData.explanationEn || '',
      explanationBn: formData.explanationBn || '',
      tags: parsedTags,
      imageUrl: formData.imageUrl || '',
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(fullQuestion);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {initialData ? `Edit Question: ${initialData.code}` : 'Create New Multi-Language Question'}
            </h2>
            <p className="text-xs text-slate-400">
              Supports English & Bangla text, mathematical equations, options scoring, and negative marking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!initialData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="h-8 gap-1 text-xs text-orange-400 border-orange-800/60 bg-orange-950/30 hover:bg-orange-900/40"
            >
              <Sparkles className="h-3.5 w-3.5" /> Quick Sample
            </Button>
          )}
          {initialData && onDuplicate && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onDuplicate(initialData)}
              className="h-8 gap-1 text-xs"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="h-8 gap-1 text-xs text-slate-300"
          >
            <Eye className="h-3.5 w-3.5 text-orange-400" /> Preview Card
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit(onSubmit as any, onError)}
            disabled={isSubmitting}
            className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 text-white font-medium"
          >
            <Save className="h-3.5 w-3.5" /> Save Question
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Row 1: Taxonomy & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" /> 1. Curriculum Hierarchy & Marks Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="code">Question Code / Identifier</Label>
                <Input id="code" {...register('code')} className="mt-1 font-mono text-xs" />
                {errors.code && <p className="text-[11px] text-red-400 mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <Label htmlFor="type">Question Type</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="mt-1 w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="MCQ_SINGLE">Single Choice MCQ (১টি সঠিক)</option>
                  <option value="MCQ_MULTIPLE">Multiple Select MCQ (একাধিক সঠিক)</option>
                  <option value="TRUE_FALSE">True / False (সত্য / মিথ্যা)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <select
                  id="difficulty"
                  {...register('difficulty')}
                  className="mt-1 w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="EASY">Easy (সহজ)</option>
                  <option value="MEDIUM">Medium (মাঝারি)</option>
                  <option value="HARD">Hard (কঠিন)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status">Publish Status</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="mt-1 w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="PUBLISHED">Published (সক্রিয়)</option>
                  <option value="DRAFT">Draft (খসড়া)</option>
                  <option value="ARCHIVED">Archived (আর্কাইভ)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-800">
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  {...register('categoryId')}
                  className="mt-1 w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                >
                  <option value="cat-1">Job Preparation (বিসিএস/ব্যাংক)</option>
                  <option value="cat-2">Medical Admission (মেডিকেল)</option>
                  <option value="cat-3">University Admission (ভার্সিটি)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="examId">Exam</Label>
                <select
                  id="examId"
                  {...register('examId')}
                  className="mt-1 w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                >
                  <option value="exam-1">46th BCS Preliminary</option>
                  <option value="exam-2">Medical Admission 2026</option>
                </select>
              </div>
              <div>
                <Label htmlFor="subjectId">Subject</Label>
                <select
                  id="subjectId"
                  {...register('subjectId')}
                  className="mt-1 w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                >
                  <option value="sub-1">Mathematics (গণিত)</option>
                  <option value="sub-2">Bangla Literature (বাংলা)</option>
                  <option value="sub-3">General Science (বিজ্ঞান)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="positiveMarks">Positive Marks (+)</Label>
                <Input
                  id="positiveMarks"
                  type="number"
                  step="0.25"
                  {...register('positiveMarks')}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label htmlFor="negativeMarks">Negative Penalty (-)</Label>
                <Input
                  id="negativeMarks"
                  type="number"
                  step="0.05"
                  {...register('negativeMarks')}
                  className="mt-1 h-8 text-xs font-mono text-rose-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Question Statement (English & Bangla) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-orange-400" /> 2. Question Text & Language Content
            </CardTitle>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setLangTab('both')}
                className={`px-2 py-0.5 rounded ${langTab === 'both' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setLangTab('en')}
                className={`px-2 py-0.5 rounded ${langTab === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                English Only
              </button>
              <button
                type="button"
                onClick={() => setLangTab('bn')}
                className={`px-2 py-0.5 rounded ${langTab === 'bn' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                বাংলা Only
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(langTab === 'both' || langTab === 'en') && (
                <div>
                  <Label htmlFor="titleEn" className="flex items-center justify-between">
                    <span>Question Statement (English)</span>
                    <span className="text-[10px] text-slate-500">Supports LaTeX/Symbols</span>
                  </Label>
                  <Textarea
                    id="titleEn"
                    rows={3}
                    placeholder="e.g. Which layer of OSI model provides encryption and compression?"
                    {...register('titleEn')}
                    className="mt-1"
                  />
                  {errors.titleEn && <p className="text-[11px] text-red-400 mt-1">{errors.titleEn.message}</p>}
                </div>
              )}

              {(langTab === 'both' || langTab === 'bn') && (
                <div>
                  <Label htmlFor="titleBn" className="flex items-center justify-between">
                    <span>প্রশ্নের বিবরণ (বাংলা)</span>
                    <span className="text-[10px] text-emerald-400">ইউনিকোড utf8mb4 সমর্থিত</span>
                  </Label>
                  <Textarea
                    id="titleBn"
                    rows={3}
                    placeholder="যেমন: ওএসআই (OSI) মডেলের কোন লেয়ার ডাটা এনক্রিপশন ও কম্প্রেশন নিশ্চিত করে?"
                    {...register('titleBn')}
                    className="mt-1"
                  />
                  {errors.titleBn && <p className="text-[11px] text-red-400 mt-1">{errors.titleBn.message}</p>}
                </div>
              )}
            </div>

            {/* Image attachment URL */}
            <div>
              <Label htmlFor="imageUrl" className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400" /> Diagram / Image Attachment URL (Optional)
              </Label>
              <Input
                id="imageUrl"
                placeholder="https://assets.example.com/questions/geometry-triangle-diagram.webp"
                {...register('imageUrl')}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Answer Options with Radio / Checkbox */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400" /> 3. Options & Correct Answer Keys
              </CardTitle>
              <CardDescription>
                Click the circular/square check badge next to an option to mark it as the correct answer.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  id: `opt-${Date.now()}`,
                  textEn: '',
                  textBn: '',
                  isCorrect: false,
                })
              }
              className="h-7 text-xs gap-1 border-slate-700"
            >
              <Plus className="h-3 w-3" /> Add Option
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.options && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errors.options.message || 'Please check option validation.'}
              </div>
            )}

            {fields.map((field, index) => {
              const isCorrect = watchedOptions[index]?.isCorrect;
              return (
                <div
                  key={field.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-3 ${
                    isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  {/* Correct Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleCorrectOptionToggle(index)}
                    className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Check className={`h-3.5 w-3.5 ${isCorrect ? 'text-white' : 'text-slate-500'}`} />
                    {isCorrect ? 'CORRECT KEY' : 'Set Correct'}
                  </button>

                  <span className="text-xs font-mono text-slate-500 font-bold px-1">
                    {String.fromCharCode(65 + index)}.
                  </span>

                  {/* English Option */}
                  <div className="flex-1 w-full">
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)} (English)`}
                      {...register(`options.${index}.textEn`)}
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Bangla Option */}
                  <div className="flex-1 w-full">
                    <Input
                      placeholder={`অপশন ${String.fromCharCode(65 + index)} (বাংলা)`}
                      {...register(`options.${index}.textBn`)}
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Remove option */}
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Delete Option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Row 4: Explanation & Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-orange-400" /> 4. Detailed Solution Explanations & Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="explanationEn">Solution Explanation (English)</Label>
                <Textarea
                  id="explanationEn"
                  rows={3}
                  placeholder="Step by step derivation or reference source..."
                  {...register('explanationEn')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="explanationBn">সমাধান ব্যাখ্যা (বাংলা)</Label>
                <Textarea
                  id="explanationBn"
                  rows={3}
                  placeholder="ধাপ অনুযায়ী ব্যাখ্যা বা বইয়ের রেফারেন্স..."
                  {...register('explanationBn')}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (Comma-separated)</Label>
              <Input
                id="tags"
                placeholder="BCS, Math, Formulas, Shortcut"
                {...register('tags')}
                className="mt-1 text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Live Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-orange-400" /> Candidate Exam Delivery Preview
          </DialogTitle>
          <DialogDescription>
            Simulated view of how candidates experience this question during timed quiz attempts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-mono text-orange-400 font-bold">{watch('code')}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">+{watchedMarks} Marks</Badge>
              <Badge variant="destructive">-{watchedNegMarks} Negative</Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-white">{watchedTitleEn || 'Untitled Question'}</div>
            {watchedTitleBn && (
              <div className="text-sm text-slate-300 font-medium">{watchedTitleBn}</div>
            )}
          </div>

          {/* Render Options */}
          <div className="space-y-2 pt-2">
            {watchedOptions.map((opt, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  opt.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-800 bg-slate-950 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt.textEn || `Option ${String.fromCharCode(65 + i)}`}</span>
                  {opt.textBn && <span className="text-slate-400">({opt.textBn})</span>}
                </div>
                {opt.isCorrect && (
                  <Badge variant="success" className="text-[10px]">
                    Answer Key
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {(watchedExpEn || watchedExpBn) && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-orange-400">Post-Exam Explanation:</div>
              {watchedExpEn && <div className="text-slate-300">{watchedExpEn}</div>}
              {watchedExpBn && <div className="text-slate-400">{watchedExpBn}</div>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
