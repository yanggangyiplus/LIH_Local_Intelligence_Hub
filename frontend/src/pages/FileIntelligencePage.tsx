/**
 * 파일 인텔리전스: 스캔 → AI 정리 계획 → 미리보기 → 승인 후 적용 → Undo.
 * 글래스모피즘 UI + 스텝 인디케이터 + toast 알림.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FolderOpen,
  Loader2,
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
  Sparkles,
  Search,
} from 'lucide-react';
import { fileIntelligenceApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';

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

function getDisplayName(path: string): string {
  const parts = path.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || path;
}

const ACTION_STYLE: Record<string, { icon: React.ReactNode; label: string; gradient: string }> = {
  rename: { icon: <FilePen size={14} />, label: '이름 변경', gradient: 'from-amber-500 to-orange-500' },
  move: { icon: <ArrowRight size={14} />, label: '이동', gradient: 'from-blue-500 to-cyan-500' },
  delete_duplicate: { icon: <Trash2 size={14} />, label: '중복 삭제', gradient: 'from-red-500 to-rose-500' },
  create_folder: { icon: <FolderPlus size={14} />, label: '폴더 생성', gradient: 'from-emerald-500 to-green-500' },
  archive: { icon: <Archive size={14} />, label: '보관', gradient: 'from-violet-500 to-purple-500' },
};

/** 단계 인디케이터 */
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ['스캔', '계획 생성', '미리보기', '적용'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step <= currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
              active
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-gray-500 border border-white/10'
            }`}>
              {step}
            </div>
            <span className={`text-xs hidden sm:block ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 rounded ${active ? 'bg-indigo-500' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FileIntelligencePage() {
  const [rootPath, setRootPath] = useState('');
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [organizeBy, setOrganizeBy] = useState<'content' | 'name' | 'time'>('content');
  const [focus, setFocus] = useState<'names' | 'locations' | 'both'>('both');
  const [previewResult, setPreviewResult] = useState<{ actions_count: number; logs?: Array<{ source_path: string; target_path?: string; operation_type: string }> } | null>(null);
  const [applied, setApplied] = useState(false);

  const currentStep = applied ? 4 : previewResult ? 3 : plan ? 2 : scanJobId ? 1 : 0;

  const scanMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.scan(rootPath),
    onSuccess: (res) => {
      setScanJobId(res.data.job_id);
      setPlan(null);
      setPreviewResult(null);
      setApplied(false);
      toast.success('스캔 완료!');
    },
    onError: () => toast.error('스캔 실패'),
  });

  const planMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.plan(scanJobId!, organizeBy, focus),
    onSuccess: (res) => {
      setPlan(res.data);
      setPreviewResult(null);
      toast.success(`AI 정리 계획 생성 완료 (${res.data.actions?.length || 0}개 작업)`);
    },
    onError: () => toast.error('계획 생성 실패'),
  });

  const previewMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.preview(plan!.plan_id),
    onSuccess: (res) => {
      setPreviewResult(res.data);
      toast.success('미리보기 완료');
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.apply(plan!.plan_id, [], false, true),
    onSuccess: (res) => {
      setPreviewResult(null);
      if (res.data?.applied) {
        setApplied(true);
        toast.success(`적용 완료 (${res.data.logs_count}개 작업)`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '적용 실패'),
  });

  const undoMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.undo(plan!.plan_id),
    onSuccess: (res) => {
      setApplied(false);
      toast.success(`되돌리기 완료: ${res.data.undone_count}/${res.data.total}개 복원`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '되돌리기 실패'),
  });

  const { data: scanResult } = useQuery({
    queryKey: ['scan', scanJobId],
    queryFn: () => fileIntelligenceApi.getScan(scanJobId!).then((r) => r.data),
    enabled: !!scanJobId,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <StepIndicator currentStep={currentStep} />

      {/* 1. 폴더 스캔 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Search size={18} className="text-indigo-400" />
          1. 폴더 스캔
        </h3>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FolderPathInput value={rootPath} onChange={setRootPath} placeholder="스캔할 폴더 경로 (예: /Users/me/Documents)" />
          </div>
          <button onClick={() => scanMutation.mutate()} disabled={!rootPath.trim() || scanMutation.isPending} className="btn-primary shrink-0">
            {scanMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
            스캔
          </button>
        </div>
      </motion.section>

      {/* 2. 스캔 결과 */}
      <AnimatePresence>
        {scanJobId && scanResult && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-4">2. 스캔 결과</h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '파일 수', value: scanResult.total_files },
                { label: '폴더 수', value: scanResult.total_dirs },
                { label: '총 크기', value: `${(scanResult.total_size_bytes / 1024 / 1024).toFixed(1)} MB` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">정리 기준</span>
                <select value={organizeBy} onChange={(e) => setOrganizeBy(e.target.value as 'content' | 'name' | 'time')} className="input-glass py-2 text-sm w-44">
                  <option value="content">내용 (텍스트 분석)</option>
                  <option value="name">이름 / 확장자</option>
                  <option value="time">수정 시각</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">초점</span>
                <select value={focus} onChange={(e) => setFocus(e.target.value as 'names' | 'locations' | 'both')} className="input-glass py-2 text-sm w-40">
                  <option value="names">이름만 개선</option>
                  <option value="locations">위치만 개선</option>
                  <option value="both">이름+위치 모두</option>
                </select>
              </label>
              <button onClick={() => planMutation.mutate()} disabled={planMutation.isPending} className="btn-primary">
                {planMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                AI 정리 계획 생성
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 3. 재구성 계획 */}
      <AnimatePresence>
        {plan && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-2">3. AI 정리 계획</h3>
            {plan.summary && <p className="text-sm text-gray-400 mb-4">{plan.summary}</p>}

            {plan.actions.length > 0 ? (
              <>
                {/* 유형별 요약 뱃지 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(
                    plan.actions.reduce<Record<string, number>>((acc, a) => {
                      acc[a.action_type] = (acc[a.action_type] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => {
                    const style = ACTION_STYLE[type] ?? { icon: <File size={14} />, label: type, gradient: 'from-gray-500 to-gray-600' };
                    return (
                      <span key={type} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${style.gradient} text-white shadow-sm`}>
                        {style.icon} {style.label} {count}
                      </span>
                    );
                  })}
                </div>

                {/* 작업 카드 목록 */}
                <div className="space-y-2 max-h-72 overflow-y-auto mb-4 pr-1">
                  {plan.actions.map((a, i) => {
                    const style = ACTION_STYLE[a.action_type] ?? { icon: <File size={14} />, label: a.action_type, gradient: 'from-gray-500 to-gray-600' };
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
                      >
                        <span className={`inline-flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium bg-gradient-to-r ${style.gradient} text-white`}>
                          {style.icon} {style.label}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                          {a.source_path && (
                            <>
                              <span className="truncate text-white font-mono text-xs" title={a.source_path}>
                                {getDisplayName(a.source_path)}
                              </span>
                              {a.target_path && (
                                <>
                                  <ChevronRight size={14} className="shrink-0 text-gray-500" />
                                  <span className="truncate text-gray-300 font-mono text-xs" title={a.target_path}>
                                    {getDisplayName(a.target_path)}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                          {!a.source_path && a.target_path && (
                            <span className="text-gray-300 font-mono text-xs">새 폴더: {getDisplayName(a.target_path)}</span>
                          )}
                        </div>
                        {a.reason && (
                          <span className="shrink-0 text-[10px] text-gray-500 max-w-[120px] truncate" title={a.reason}>{a.reason}</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending} className="btn-secondary">
                    {previewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                    미리보기
                  </button>
                  <button
                    onClick={() => { if (window.confirm('정말 파일 정리를 적용할까요?')) applyMutation.mutate(); }}
                    disabled={applyMutation.isPending || applied}
                    className="btn-primary"
                  >
                    {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                    적용
                  </button>
                  {applied && (
                    <button
                      onClick={() => { if (window.confirm('되돌릴까요?')) undoMutation.mutate(); }}
                      disabled={undoMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      {undoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                      되돌리기
                    </button>
                  )}
                </div>

                {/* 미리보기 결과 */}
                {previewResult && (
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 text-sm">
                    <p className="font-medium text-white mb-2">미리보기 ({previewResult.actions_count}개 작업)</p>
                    {previewResult.logs?.map((log, i) => (
                      <p key={i} className="text-gray-400 text-xs">
                        {log.operation_type}: {log.source_path}{log.target_path && ` → ${log.target_path}`}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">제안할 정리 작업이 없습니다.</p>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
