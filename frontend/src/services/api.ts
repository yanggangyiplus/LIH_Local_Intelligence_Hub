/**
 * API 클라이언트.
 * Backend FastAPI와 통신.
 */

import axios from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

/** File Intelligence */
export const fileIntelligenceApi = {
  scan: (rootPath: string) => api.post('/file-intelligence/scan', { root_path: rootPath }),
  getScan: (jobId: string) => api.get(`/file-intelligence/scan/${jobId}`),
  plan: (jobId: string) => api.post('/file-intelligence/plan', { job_id: jobId }),
  preview: (planId: string, actionIds?: string[]) =>
    api.post('/file-intelligence/preview', { plan_id: planId, action_ids: actionIds ?? [] }),
  apply: (planId: string, actionIds: string[], dryRun: boolean, confirm: boolean) =>
    api.post('/file-intelligence/apply', {
      plan_id: planId,
      action_ids: actionIds,
      dry_run: dryRun,
      confirm,
    }),
  history: () => api.get('/file-intelligence/history'),
};

/** Knowledge (RAG) */
export const knowledgeApi = {
  index: (rootPath: string, excludePatterns?: string[]) =>
    api.post('/knowledge/index', { root_path: rootPath, exclude_patterns: excludePatterns }),
  getIndexStatus: (jobId: string) => api.get(`/knowledge/index/${jobId}`),
  query: (query: string, scope?: string, scopePath?: string, topK?: number) =>
    api.post('/knowledge/query', {
      query,
      scope: scope ?? 'all',
      scope_path: scopePath,
      top_k: topK ?? 5,
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

/** System */
export const systemApi = {
  health: () => api.get('/health'),
  config: () => api.get('/config'),
  llmModels: () => api.get('/llm/models'),
  /** 네이티브 폴더 선택 다이얼로그 (브라우저용) */
  pickFolder: () => api.get<{ path: string | null }>('/pick-folder'),
};

export default api;
