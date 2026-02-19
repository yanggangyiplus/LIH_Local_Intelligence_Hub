/**
 * 파일 인텔리전스: 스캔 → AI 정리 계획 → 미리보기 → 승인 후 적용. 작업 로그(Undo) 지원.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fileIntelligenceApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import {
  FolderOpen,
  Loader2,
  CheckCircle,
  Eye,
  PlayCircle,
  FilePen,
  ArrowRight,
  Trash2,
  FolderPlus,
  Archive,
  File,
  ChevronRight,
  Undo2,
} from 'lucide-react';

interface PlanAction {
  action_type: string;
  source_path: string;
  target_path?: string;
  reason?: string;
}

interface Plan {
  plan_id: string;
  root_path: string;
  actions: PlanAction[];
  summary?: string;
}

/** 경로에서 파일/폴더명만 추출 */
function getDisplayName(path: string): string {
  const parts = path.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || path;
}

/** 작업 유형별 아이콘·라벨·색상 */
const ACTION_STYLE: Record<string, { icon: React.ReactNode; label: string; bg: string; text: string }> = {
  rename: { icon: <FilePen size={16} />, label: '이름 변경', bg: 'bg-amber-900/50', text: 'text-amber-200' },
  move: { icon: <ArrowRight size={16} />, label: '이동', bg: 'bg-blue-900/50', text: 'text-blue-200' },
  delete_duplicate: { icon: <Trash2 size={16} />, label: '중복 삭제', bg: 'bg-red-900/50', text: 'text-red-200' },
  create_folder: { icon: <FolderPlus size={16} />, label: '폴더 생성', bg: 'bg-emerald-900/50', text: 'text-emerald-200' },
  archive: { icon: <Archive size={16} />, label: '보관', bg: 'bg-violet-900/50', text: 'text-violet-200' },
};

export default function FileIntelligencePage() {
  const [rootPath, setRootPath] = useState('');
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [organizeBy, setOrganizeBy] = useState<'content' | 'name' | 'time'>('content');
  const [focus, setFocus] = useState<'names' | 'locations' | 'both'>('both');
  const [previewResult, setPreviewResult] = useState<{ actions_count: number; logs?: Array<{ source_path: string; target_path?: string; operation_type: string }> } | null>(null);
  const [applied, setApplied] = useState(false);

  const scanMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.scan(rootPath),
    onSuccess: (res) => {
      setScanJobId(res.data.job_id);
      setPlan(null);
      setPreviewResult(null);
    },
  });

  const planMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.plan(scanJobId!, organizeBy, focus),
    onSuccess: (res) => {
      setPlan(res.data);
      setPreviewResult(null);
    },
    enabled: !!scanJobId,
  });

  const previewMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.preview(plan!.plan_id),
    onSuccess: (res) => setPreviewResult(res.data),
    onError: () => setPreviewResult(null),
    enabled: !!plan,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      fileIntelligenceApi.apply(plan!.plan_id, [], false, true),
    onSuccess: (res) => {
      setPreviewResult(null);
      if (res.data?.applied) {
        setApplied(true);
        alert(`적용 완료 (${res.data.logs_count}개 작업)`);
      }
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : '적용 실패');
    },
    enabled: !!plan,
  });

  const undoMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.undo(plan!.plan_id),
    onSuccess: (res) => {
      const d = res.data;
      setApplied(false);
      alert(`되돌리기 완료: ${d.undone_count}/${d.total}개 작업 복원`);
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : '되돌리기 실패');
    },
    enabled: !!plan,
  });

  const { data: scanResult } = useQuery({
    queryKey: ['scan', scanJobId],
    queryFn: () => fileIntelligenceApi.getScan(scanJobId!).then((r) => r.data),
    enabled: !!scanJobId,
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">파일 인텔리전스</h2>
        <p className="text-gray-300 mt-1">
          폴더를 스캔하고 AI가 제안하는 정리 계획을 생성합니다. 적용 전 미리보기를 확인하세요.
        </p>
      </header>

      <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
        <h3 className="font-semibold text-white mb-4">1. 폴더 스캔</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FolderPathInput
              value={rootPath}
              onChange={setRootPath}
              placeholder="스캔할 폴더 경로 (예: /Users/me/Documents)"
            />
          </div>
          <button
            onClick={() => scanMutation.mutate()}
            disabled={!rootPath.trim() || scanMutation.isPending}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            {scanMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
            스캔
          </button>
        </div>
        {scanMutation.isError && (
          <p className="text-red-400 mt-2 text-sm">
            {(scanMutation.error as Error).message}
          </p>
        )}
      </section>

      {scanJobId && scanResult && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">2. 스캔 결과</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">파일 수</p>
              <p className="text-xl font-semibold text-white">{scanResult.total_files}</p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">폴더 수</p>
              <p className="text-xl font-semibold text-white">{scanResult.total_dirs}</p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">총 크기</p>
              <p className="text-xl font-semibold text-white">
                {(scanResult.total_size_bytes / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">정리 기준:</span>
                <select
                  value={organizeBy}
                  onChange={(e) => setOrganizeBy(e.target.value as 'content' | 'name' | 'time')}
                  className="px-3 py-1.5 border border-gray-500 rounded-lg text-white bg-gray-700"
                >
                  <option value="content">내용 (파일 내부 텍스트)</option>
                  <option value="name">이름·확장자</option>
                  <option value="time">시간 (수정 시각)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">초점:</span>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as 'names' | 'locations' | 'both')}
                  className="px-3 py-1.5 border border-gray-500 rounded-lg text-white bg-gray-700"
                >
                  <option value="names">이름만 개선</option>
                  <option value="locations">위치만 개선</option>
                  <option value="both">이름+위치 모두</option>
                </select>
              </label>
            </div>
            <button
              onClick={() => planMutation.mutate()}
              disabled={planMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {planMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              AI 정리 계획 생성
            </button>
          </div>
        </section>
      )}

      {plan && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">3. 재구성 계획</h3>
          {plan.summary && (
            <p className="text-sm text-gray-300 mb-4">{plan.summary}</p>
          )}
          {plan.actions.length > 0 ? (
            <>
              {/* 작업 유형별 요약 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(
                  plan.actions.reduce<Record<string, number>>((acc, a) => {
                    const t = a.action_type || 'unknown';
                    acc[t] = (acc[t] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => {
                  const style = ACTION_STYLE[type] ?? {
                    icon: <File size={16} />,
                    label: type,
                    bg: 'bg-gray-600',
                    text: 'text-gray-200',
                  };
                  return (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${style.bg} ${style.text} border border-gray-600`}
                    >
                      {style.icon}
                      {style.label} {count}
                    </span>
                  );
                })}
              </div>

              {/* 시각화된 작업 카드 목록 */}
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                {plan.actions.map((a, i) => {
                  const style = ACTION_STYLE[a.action_type] ?? {
                    icon: <File size={16} />,
                    label: a.action_type,
                    bg: 'bg-gray-600',
                    text: 'text-gray-200',
                  };
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-xl border border-gray-600 bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      <span className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.icon}
                        {style.label}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        {a.source_path && (
                          <>
                            <span className="truncate text-white font-mono text-sm" title={a.source_path}>
                              {getDisplayName(a.source_path)}
                            </span>
                            {a.target_path ? (
                              <>
                                <ChevronRight size={16} className="shrink-0 text-gray-400" />
                                <span className="truncate text-gray-300 font-mono text-sm" title={a.target_path}>
                                  {getDisplayName(a.target_path)}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">(삭제 예정)</span>
                            )}
                          </>
                        )}
                        {!a.source_path && a.target_path && (
                          <span className="text-gray-300 font-mono text-sm" title={a.target_path}>
                            새 폴더: {getDisplayName(a.target_path)}
                          </span>
                        )}
                      </div>
                      {a.reason && (
                        <span className="shrink-0 text-xs text-gray-400 max-w-[140px] truncate" title={a.reason}>
                          {a.reason}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => previewMutation.mutate()}
                  disabled={previewMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
                >
                  {previewMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                  미리보기
                </button>
                <button
                  onClick={() => window.confirm('정말 파일 정리를 적용할까요? 적용 후 파일이 이동/삭제됩니다.') && applyMutation.mutate()}
                  disabled={applyMutation.isPending || applied}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {applyMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                  적용
                </button>
                {applied && (
                  <button
                    onClick={() => window.confirm('적용된 파일 정리를 되돌릴까요?') && undoMutation.mutate()}
                    disabled={undoMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {undoMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
                    되돌리기 (Undo)
                  </button>
                )}
              </div>
              {previewResult && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg text-sm">
                  <p className="font-medium text-white mb-2">미리보기 결과 ({previewResult.actions_count}개 작업)</p>
                  {previewResult.logs?.map((log, i) => (
                    <p key={i} className="text-gray-300">
                      {log.operation_type}: {log.source_path}
                      {log.target_path && ` → ${log.target_path}`}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">제안할 정리 작업이 없습니다.</p>
          )}
        </section>
      )}
    </div>
  );
}
