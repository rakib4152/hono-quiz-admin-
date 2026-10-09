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
} from 'lucide-react';
import { QuizDTO } from '../../../lib/api/client.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { toast } from 'sonner';

interface QuizzesPageProps {
  quizzes: QuizDTO[];
  onNewQuiz: () => void;
  onEditQuiz: (q: QuizDTO) => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({ quizzes, onNewQuiz, onEditQuiz }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Quiz & Examination Management ({quizzes.length} live)
          </h2>
          <p className="text-xs text-slate-400">
            Publish timed examinations, assign questions, set negative markings, and manage paid subscriptions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={onNewQuiz}
          className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20"
        >
          <Plus className="h-3.5 w-3.5" /> Schedule New Quiz
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <Badge
                  variant={quiz.status === 'PUBLISHED' ? 'success' : 'outline'}
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
                  <span className="font-bold text-white font-mono">{quiz.durationMinutes} Minutes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Questions</span>
                  <span className="font-bold text-orange-400 font-mono">{quiz.totalQuestions} Questions</span>
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
                    onClick={() => onEditQuiz(quiz)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.success(`Quiz ${quiz.titleEn} duplicated.`)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
