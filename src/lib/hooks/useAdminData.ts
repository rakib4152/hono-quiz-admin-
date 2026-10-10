import { useState, useEffect, useCallback } from 'react';
import {
  apiFetch,
  mapPrismaCategory,
  mapPrismaExam,
  mapPrismaQuiz,
  CategoryDTO,
  ExamDTO,
  QuizDTO,
  getApiBaseUrl,
} from '../api/client.js';

export interface UseAdminDataResult {
  categories: CategoryDTO[];
  exams: ExamDTO[];
  quizzes: QuizDTO[];
  isLoading: boolean;
  error: string | null;
  isLiveBackend: boolean;
  apiUrl: string;
  refetch: () => Promise<void>;
  createCategory: (data: Partial<CategoryDTO>) => Promise<CategoryDTO | null>;
  createExam: (data: Partial<ExamDTO>) => Promise<ExamDTO | null>;
  createQuiz: (data: Partial<QuizDTO>) => Promise<QuizDTO | null>;
}

/**
 * Custom React Hook to fetch and synchronize live data from Hono Cloudflare API
 * Connected to Hostinger MySQL via Prisma
 */
export function useAdminData(initialData?: {
  categories?: CategoryDTO[];
  exams?: ExamDTO[];
  quizzes?: QuizDTO[];
}): UseAdminDataResult {
  const [categories, setCategories] = useState<CategoryDTO[]>(initialData?.categories || []);
  const [exams, setExams] = useState<ExamDTO[]>(initialData?.exams || []);
  const [quizzes, setQuizzes] = useState<QuizDTO[]>(initialData?.quizzes || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  const apiUrl = getApiBaseUrl();

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch from Hono API endpoints
      const [catRes, examRes, quizRes] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/exams'),
        apiFetch('/quizzes'),
      ]);

      const live = catRes.isLiveBackend || examRes.isLiveBackend || quizRes.isLiveBackend;
      setIsLiveBackend(live);

      // 1. Process & map Categories
      if (catRes.ok && Array.isArray(catRes.data)) {
        const mapped = catRes.data.map(mapPrismaCategory);
        if (mapped.length > 0) setCategories(mapped);
      }

      // 2. Process & map Exams
      if (examRes.ok && Array.isArray(examRes.data)) {
        const mapped = examRes.data.map(mapPrismaExam);
        if (mapped.length > 0) setExams(mapped);
      }

      // 3. Process & map Quizzes
      if (quizRes.ok && Array.isArray(quizRes.data)) {
        const mapped = quizRes.data.map(mapPrismaQuiz);
        if (mapped.length > 0) setQuizzes(mapped);
      }

      // Check if any error occurred
      if (!catRes.ok && !examRes.ok && !quizRes.ok) {
        setError(catRes.error || examRes.error || quizRes.error || 'Failed to fetch catalog data');
      }
    } catch (err: any) {
      console.error('[useAdminData] Fetch failed:', err);
      setError(err.message || 'Network request failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Create Category mutation
  const createCategory = async (data: Partial<CategoryDTO>): Promise<CategoryDTO | null> => {
    try {
      const res = await apiFetch('/categories', {
        method: 'POST',
        body: {
          name: data.nameEn || data.nameBn,
          nameEn: data.nameEn,
          nameBn: data.nameBn,
          slug: data.slug || data.nameEn?.toLowerCase().replace(/\s+/g, '-'),
          description: data.description,
        },
      });

      if (res.ok) {
        const newCat = mapPrismaCategory(res.data);
        setCategories((prev) => [newCat, ...prev]);
        return newCat;
      }
      return null;
    } catch (e) {
      console.error('Error creating category:', e);
      return null;
    }
  };

  // Create Exam mutation
  const createExam = async (data: Partial<ExamDTO>): Promise<ExamDTO | null> => {
    try {
      const res = await apiFetch('/exams', {
        method: 'POST',
        body: {
          categoryId: data.categoryId,
          name: data.nameEn || data.nameBn,
          nameEn: data.nameEn,
          nameBn: data.nameBn,
          slug: data.slug || data.nameEn?.toLowerCase().replace(/\s+/g, '-'),
        },
      });

      if (res.ok) {
        const newExam = mapPrismaExam(res.data);
        setExams((prev) => [newExam, ...prev]);
        return newExam;
      }
      return null;
    } catch (e) {
      console.error('Error creating exam:', e);
      return null;
    }
  };

  // Create Quiz mutation
  const createQuiz = async (data: Partial<QuizDTO>): Promise<QuizDTO | null> => {
    try {
      const res = await apiFetch('/quizzes', {
        method: 'POST',
        body: {
          examId: data.examId,
          title: data.titleEn || data.titleBn,
          titleEn: data.titleEn,
          titleBn: data.titleBn,
          slug: data.slug || data.titleEn?.toLowerCase().replace(/\s+/g, '-'),
          durationSeconds: (data.durationMinutes || 60) * 60,
          price: data.priceBdt || 0,
          currency: 'BDT',
          status: data.status || 'PUBLISHED',
        },
      });

      if (res.ok) {
        const newQuiz = mapPrismaQuiz(res.data);
        setQuizzes((prev) => [newQuiz, ...prev]);
        return newQuiz;
      }
      return null;
    } catch (e) {
      console.error('Error creating quiz:', e);
      return null;
    }
  };

  return {
    categories,
    exams,
    quizzes,
    isLoading,
    error,
    isLiveBackend,
    apiUrl,
    refetch,
    createCategory,
    createExam,
    createQuiz,
  };
}
