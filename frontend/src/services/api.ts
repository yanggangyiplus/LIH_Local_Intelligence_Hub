/**
 * API 클라이언트.
 * Backend FastAPI와 통신. 모든 엔드포인트 타입 정의.
 */

import axios from 'axios';

/** 로컬: /api/v1 (Vite 프록시). 배포: VITE_API_BASE_URL (백엔드 공개 URL) */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

/** Dashboard */
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentActivity: (limit = 10) => api.get(`/dashboard/recent-activity?limit=${limit}`),
};

/** File Intelligence */
export const fileIntelligenceApi = {
  scan: (rootPath: string) => api.post('/file-intelligence/scan', { root_path: rootPath }),
  getScan: (jobId: string) => api.get(`/file-intelligence/scan/${jobId}`),
  plan: (jobId: string, organizeBy = 'content', focus = 'both') =>
    api.post('/file-intelligence/plan', { job_id: jobId, organize_by: organizeBy, focus }),
  preview: (planId: string, actionIds?: string[]) =>
    api.post('/file-intelligence/preview', { plan_id: planId, action_ids: actionIds ?? [] }),
  apply: (planId: string, actionIds: string[], dryRun: boolean, confirm: boolean) =>
    api.post('/file-intelligence/apply', {
      plan_id: planId,
      action_ids: actionIds,
      dry_run: dryRun,
      confirm,
    }),
  undo: (planId: string) => api.post(`/file-intelligence/undo/${planId}`),
  history: () => api.get('/file-intelligence/history'),
};

/** Knowledge (RAG) */
export const knowledgeApi = {
  index: (rootPath: string, excludePatterns?: string[]) =>
    api.post('/knowledge/index', { root_path: rootPath, exclude_patterns: excludePatterns }),
  getIndexStatus: (jobId: string) => api.get(`/knowledge/index/${jobId}`),
  getStats: () => api.get<{ collection_count: number; ready: boolean; error?: string }>('/knowledge/stats'),
  query: (query: string, scope?: string, scopePath?: string, topK?: number) =>
    api.post('/knowledge/query', {
      query,
      scope: scope ?? 'all',
      scope_path: scopePath,
      top_k: topK ?? 8,
    }),
  search: (query: string, scope?: string, scopePath?: string) =>
    api.post('/knowledge/search', { query, scope, scope_path: scopePath }),
};

/** Study */
export const studyApi = {
  concepts: (rootPath: string) =>
    api.post('/study/concepts', { root_path: rootPath, options: {} }),
  summary: (rootPath: string) =>
    api.post('/study/summary', { root_path: rootPath, options: {} }),
  questions: (rootPath: string) =>
    api.post('/study/questions', { root_path: rootPath, options: {} }),
  interviewQuestions: (rootPath: string) =>
    api.post('/study/interview-questions', { root_path: rootPath, options: {} }),
  plan: (rootPath: string) =>
    api.post('/study/plan', { root_path: rootPath, options: {} }),
};

/** Settings */
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: { llm_provider?: string; openai_api_key?: string; openai_chat_model?: string }) =>
    api.put('/settings', data),
};

/** System */
export const systemApi = {
  health: () => api.get('/health'),
  config: () => api.get('/settings'),
  llmModels: () => api.get('/llm/models'),
  pickFolder: () => api.get<{ path: string | null }>('/pick-folder'),
};

export default api;
