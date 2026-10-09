import React, { useState } from 'react';
import {
  Layers,
  GraduationCap,
  BookOpen,
  BookmarkCheck,
  Plus,
  Edit,
  Trash2,
  FolderTree,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import { toast } from 'sonner';

export const CatalogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const categories = [
    { id: 'cat-1', nameEn: 'Job Preparation', nameBn: 'চাকরি প্রস্তুতি', examsCount: 8, status: 'ACTIVE' },
    { id: 'cat-2', nameEn: 'Medical Admission', nameBn: 'মেডিকেল ভর্তি প্রস্তুতি', examsCount: 4, status: 'ACTIVE' },
    { id: 'cat-3', nameEn: 'University Admission', nameBn: 'বিশ্ববিদ্যালয় ভর্তি পরীক্ষা', examsCount: 12, status: 'ACTIVE' },
    { id: 'cat-4', nameEn: 'Engineering Admission', nameBn: 'প্রকৌশল ভর্তি পরীক্ষা (বুয়েট/কুয়েট)', examsCount: 3, status: 'ACTIVE' },
  ];

  const exams = [
    { id: 'exam-1', category: 'Job Preparation', nameEn: '46th BCS Preliminary', nameBn: '৪৬তম বিসিএস প্রিলিমিনারি', quizzesCount: 24, status: 'ACTIVE' },
    { id: 'exam-2', category: 'Job Preparation', nameEn: 'Combined 8 Banks Officer Cash', nameBn: 'সমন্বিত ৮ ব্যাংক অফিসার ক্যাশ', quizzesCount: 16, status: 'ACTIVE' },
    { id: 'exam-3', category: 'Medical Admission', nameEn: 'Medical Admission 2026', nameBn: 'মেডিকেল ভর্তি পরীক্ষা ২০২৬', quizzesCount: 30, status: 'ACTIVE' },
  ];

  const subjects = [
    { id: 'sub-1', exam: '46th BCS Preliminary', nameEn: 'Mathematics & Mental Ability', nameBn: 'গাণিতিক যুক্তি ও মানসিক দক্ষতা', marks: 30 },
    { id: 'sub-2', exam: '46th BCS Preliminary', nameEn: 'Bangla Language & Literature', nameBn: 'বাংলা ভাষা ও সাহিত্য', marks: 35 },
    { id: 'sub-3', exam: '46th BCS Preliminary', nameEn: 'English Language & Literature', nameBn: 'ইংরেজি ভাষা ও সাহিত্য', marks: 35 },
    { id: 'sub-4', exam: '46th BCS Preliminary', nameEn: 'Bangladesh Affairs', nameBn: 'বাংলাদেশ বিষয়াবলি', marks: 30 },
    { id: 'sub-5', exam: '46th BCS Preliminary', nameEn: 'International Affairs', nameBn: 'আন্তর্জাতিক বিষয়াবলি', marks: 20 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Curriculum Catalog & Hierarchy Management
          </h2>
          <p className="text-xs text-slate-400">
            Hierarchy: Category → Exam → Subject → Topic → Chapter → Questions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.success('Entity creation modal triggered')}
          className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add New Item
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="categories" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> 1. Categories (4)
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-1.5 text-xs">
            <GraduationCap className="h-3.5 w-3.5" /> 2. Exams (3)
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> 3. Subjects (5)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Categories */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">{cat.nameEn}</div>
                    <div className="text-xs text-slate-400 font-medium">{cat.nameBn}</div>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {cat.examsCount} Exams Configured
                      </Badge>
                      <Badge variant="success" className="text-[10px]">
                        {cat.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Exams */}
        <TabsContent value="exams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exams.map((ex) => (
              <Card key={ex.id}>
                <CardContent className="p-4 space-y-2">
                  <span className="text-[10px] font-mono text-orange-400 uppercase font-semibold">
                    {ex.category}
                  </span>
                  <div className="text-sm font-semibold text-white">{ex.nameEn}</div>
                  <div className="text-xs text-slate-400">{ex.nameBn}</div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{ex.quizzesCount} Quizzes</span>
                    <Badge variant="success" className="text-[10px]">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Subjects */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Subject Name (English & বাংলা)</th>
                  <th className="p-3">Parent Exam</th>
                  <th className="p-3">Marks Weightage</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-semibold text-white">{sub.nameEn}</div>
                      <div className="text-slate-400 text-[11px]">{sub.nameBn}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{sub.exam}</td>
                    <td className="p-3 font-bold text-orange-400">{sub.marks} Marks</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
