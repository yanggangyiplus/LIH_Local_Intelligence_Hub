/**
 * 대시보드: 통계 카드, 최근 활동, 빠른 시작 가이드.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  FileSearch,
  BookOpen,
  GraduationCap,
  FolderOpen,
  Activity,
  Zap,
  ArrowRight,
  Database,
  Brain,
  Shield,
  Trash2,
  RotateCcw,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { dashboardApi } from '../services/api';

/** 통계 카드 */
function StatCard({ icon: Icon, label, value, color, delay }: {
  icon: typeof FileSearch; label: string; value: number | string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/** 빠른 시작 카드 */
function QuickStartCard({ step, title, desc, icon: Icon, to, delay }: {
  step: number; title: string; desc: string; icon: typeof FileSearch; to: string; delay: number;
}) {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={() => navigate(to)}
      className="glass-card-hover p-6 text-left w-full group"
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold shrink-0">
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={18} className="text-indigo-400" />
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-400">{desc}</p>
        </div>
        <ArrowRight size={18} className="text-gray-500 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearOptions, setClearOptions] = useState({
    clear_indexed_files: false,
    clear_reorganization_logs: false,
    clear_index_jobs: false,
    clear_scan_cache: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => (await dashboardApi.stats()).data,
    refetchInterval: 10000,
  });

  const { data: activityData, refetch: refetchActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => (await dashboardApi.recentActivity()).data,
    refetchInterval: 10000,
  });

  const clearMutation = useMutation({
    mutationFn: (options: typeof clearOptions & { clear_all?: boolean }) => dashboardApi.clear(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      refetchActivity();
      setShowClearModal(false);
      setClearOptions({
        clear_indexed_files: false,
        clear_reorganization_logs: false,
        clear_index_jobs: false,
        clear_scan_cache: false,
      });
      toast.success('데이터가 초기화되었습니다.');
    },
    onError: () => toast.error('초기화 실패'),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => dashboardApi.deleteActivity(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      refetchActivity();
      toast.success('활동이 삭제되었습니다.');
    },
    onError: () => toast.error('삭제 실패'),
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* 히어로 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white mb-2">
            안녕하세요 <span className="gradient-text">LIH</span>입니다
          </h1>
          <p className="text-gray-400 max-w-2xl">
            로컬 파일을 AI가 이해하고 정리합니다. 프라이버시를 지키면서 지능적인 파일 관리, 지식 검색, 학습을 경험하세요.
          </p>
        </div>
      </motion.div>

      {/* 통계 카드 + 초기화 버튼 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white px-1">통계</h2>
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm transition-colors"
          >
            <RotateCcw size={14} />
            초기화
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Database} label="인덱싱 문서" value={stats?.indexed_files ?? 0} color="bg-indigo-600/80" delay={0.1} />
          <StatCard icon={FolderOpen} label="파일 정리" value={stats?.reorganization_count ?? 0} color="bg-purple-600/80" delay={0.15} />
          <StatCard icon={Activity} label="스캔 횟수" value={stats?.scan_count ?? 0} color="bg-pink-600/80" delay={0.2} />
          <StatCard icon={Zap} label="AI 분석" value={stats?.ai_queries ?? 0} color="bg-emerald-600/80" delay={0.25} />
        </div>
      </div>

      {/* 빠른 시작 + 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 빠른 시작 */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-lg font-semibold text-white px-1">빠른 시작</h2>
          <QuickStartCard
            step={1} title="파일 인텔리전스" desc="폴더를 스캔하고 AI가 정리 계획을 제안합니다."
            icon={FileSearch} to="/file-intelligence" delay={0.3}
          />
          <QuickStartCard
            step={2} title="지식 엔진 (RAG)" desc="문서를 인덱싱하고 AI에게 질문하세요."
            icon={BookOpen} to="/knowledge" delay={0.35}
          />
          <QuickStartCard
            step={3} title="학습 엔진" desc="핵심 개념 추출, 요약, 질문 생성으로 학습을 도와줍니다."
            icon={GraduationCap} to="/study" delay={0.4}
          />
        </div>

        {/* 최근 활동 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-white px-1">최근 활동</h2>
          <div className="glass-card p-4 space-y-3">
            {activityData?.activities?.length > 0 ? (
              activityData.activities.slice(0, 6).map((a: { id: string; type: string; description: string; status: string; created_at: string }, i: number) => (
                <motion.div
                  key={`${a.id}-${i}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 group"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'indexing' ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{a.description}</p>
                    <p className="text-xs text-gray-500">{a.created_at?.slice(0, 16)?.replace('T', ' ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('이 활동을 삭제하시겠습니까?')) {
                        deleteActivityMutation.mutate({ type: a.type, id: a.id });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-600/20 text-red-400 transition-all"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Activity size={32} className="mb-2 opacity-30" />
                <p className="text-sm">아직 활동이 없습니다</p>
                <p className="text-xs">위의 빠른 시작으로 시작하세요!</p>
              </div>
            )}
          </div>

          {/* 핵심 특징 */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">핵심 특징</h3>
            {[
              { icon: Shield, text: '완전 로컬 처리 — 외부 전송 없음', color: 'text-emerald-400' },
              { icon: Brain, text: 'OpenAI + 로컬 AI 하이브리드', color: 'text-indigo-400' },
              { icon: Zap, text: '이해→계획→실행→되돌리기', color: 'text-purple-400' },
            ].map(({ icon: I, text, color }) => (
              <div key={text} className="flex items-center gap-2">
                <I size={14} className={color} />
                <span className="text-xs text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 초기화 모달 */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">데이터 초기화</h3>
              <button
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded hover:bg-white/10 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">초기화할 데이터를 선택하세요:</p>
            <div className="space-y-2 mb-4">
              {[
                { key: 'clear_indexed_files', label: '인덱싱 문서', count: stats?.indexed_files ?? 0 },
                { key: 'clear_reorganization_logs', label: '파일 정리 기록', count: stats?.reorganization_count ?? 0 },
                { key: 'clear_index_jobs', label: '인덱싱 작업', count: stats?.index_jobs ?? 0 },
                { key: 'clear_scan_cache', label: '스캔 캐시', count: stats?.scan_count ?? 0 },
              ].map(({ key, label, count }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer"
                >
                  {clearOptions[key as keyof typeof clearOptions] ? (
                    <CheckSquare size={18} className="text-indigo-400" />
                  ) : (
                    <Square size={18} className="text-gray-500" />
                  )}
                  <span className="text-sm text-white flex-1">{label}</span>
                  <span className="text-xs text-gray-500">({count}개)</span>
                  <input
                    type="checkbox"
                    checked={clearOptions[key as keyof typeof clearOptions]}
                    onChange={(e) =>
                      setClearOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="hidden"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setClearOptions({
                    clear_indexed_files: true,
                    clear_reorganization_logs: true,
                    clear_index_jobs: true,
                    clear_scan_cache: true,
                  });
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 text-sm"
              >
                전체 선택
              </button>
              <button
                onClick={() => {
                  if (confirm('선택한 데이터를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    clearMutation.mutate(clearOptions);
                  }
                }}
                disabled={!Object.values(clearOptions).some(Boolean) || clearMutation.isPending}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
              >
                {clearMutation.isPending ? '초기화 중...' : '초기화'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
