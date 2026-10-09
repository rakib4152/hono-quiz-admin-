/**
 * Catalog API Module
 * Models: Category, Exam, Subject, Topic
 */

import { dbStore, CategoryRecord, ExamRecord, SubjectRecord, TopicRecord } from '../../services/store.js';

export function handleCatalogRoutes(path: string, method: string, body: any) {
  // Categories
  if (path === '/categories' && method === 'GET') {
    const list = Array.from(dbStore.categories.values());
    return { status: 200, data: { success: true, count: list.length, data: list } };
  }

  if (path === '/categories' && method === 'POST') {
    const { name, slug } = body || {};
    if (!name || !slug) return { status: 400, data: { success: false, error: 'name and slug required' } };
    const cat: CategoryRecord = {
      id: `cat_${Date.now()}`,
      name,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbStore.categories.set(cat.id, cat);
    return { status: 201, data: { success: true, data: cat } };
  }

  // Exams
  if (path === '/exams' && method === 'GET') {
    const list = Array.from(dbStore.exams.values());
    return { status: 200, data: { success: true, count: list.length, data: list } };
  }

  if (path === '/exams' && method === 'POST') {
    const { categoryId, name, slug, description } = body || {};
    if (!categoryId || !name || !slug) {
      return { status: 400, data: { success: false, error: 'categoryId, name and slug required' } };
    }
    const exam: ExamRecord = {
      id: `exam_${Date.now()}`,
      categoryId,
      name,
      slug,
      description: description || null,
    };
    dbStore.exams.set(exam.id, exam);
    return { status: 201, data: { success: true, data: exam } };
  }

  // Subjects
  if (path === '/subjects' && method === 'GET') {
    const list = Array.from(dbStore.subjects.values());
    return { status: 200, data: { success: true, count: list.length, data: list } };
  }

  if (path === '/subjects' && method === 'POST') {
    const { name, slug } = body || {};
    if (!name || !slug) return { status: 400, data: { success: false, error: 'name and slug required' } };
    const sub: SubjectRecord = {
      id: `sub_${Date.now()}`,
      name,
      slug,
    };
    dbStore.subjects.set(sub.id, sub);
    return { status: 201, data: { success: true, data: sub } };
  }

  // Topics
  if (path === '/topics' && method === 'GET') {
    const list = Array.from(dbStore.topics.values());
    return { status: 200, data: { success: true, count: list.length, data: list } };
  }

  if (path === '/topics' && method === 'POST') {
    const { subjectId, name, slug } = body || {};
    if (!subjectId || !name || !slug) {
      return { status: 400, data: { success: false, error: 'subjectId, name and slug required' } };
    }
    const top: TopicRecord = {
      id: `top_${Date.now()}`,
      subjectId,
      name,
      slug,
    };
    dbStore.topics.set(top.id, top);
    return { status: 201, data: { success: true, data: top } };
  }

  return null;
}
