/**
 * 대시보드: 통계 카드, 최근 활동, 빠른 시작 가이드.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => (await dashboardApi.stats()).data,
  });

  const { data: activityData } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => (await dashboardApi.recentActivity()).data,
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

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Database} label="인덱싱 문서" value={stats?.indexed_files ?? 0} color="bg-indigo-600/80" delay={0.1} />
        <StatCard icon={FolderOpen} label="파일 정리" value={stats?.reorganization_count ?? 0} color="bg-purple-600/80" delay={0.15} />
        <StatCard icon={Activity} label="스캔 횟수" value={stats?.scan_count ?? 0} color="bg-pink-600/80" delay={0.2} />
        <StatCard icon={Zap} label="AI 분석" value={stats?.ai_queries ?? 0} color="bg-emerald-600/80" delay={0.25} />
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
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'indexing' ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{a.description}</p>
                    <p className="text-xs text-gray-500">{a.created_at?.slice(0, 16)?.replace('T', ' ')}</p>
                  </div>
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
    </div>
  );
}
