/**
 * 메인 레이아웃: 글래스모피즘 사이드바 + 그래디언트 배경.
 * LLM 상태 표시, 네비게이션, 브랜딩 포함.
 */
import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileSearch,
  BookOpen,
  GraduationCap,
  Settings,
  CreditCard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { systemApi } from '../services/api';

const navItems = [
  { to: '/', icon: Download, label: '다운로드', desc: '앱 & 소개' },
  { to: '/dashboard', icon: LayoutDashboard, label: '대시보드', desc: '통계 & 활동' },
  { to: '/file-intelligence', icon: FileSearch, label: '파일 인텔리전스', desc: 'AI 파일 정리' },
  { to: '/knowledge', icon: BookOpen, label: '지식 엔진', desc: 'RAG 검색 & 채팅' },
  { to: '/study', icon: GraduationCap, label: '학습 엔진', desc: '개념·요약·질문' },
  { to: '/pricing', icon: CreditCard, label: '요금제', desc: 'Free / Pro / Enterprise' },
  { to: '/settings', icon: Settings, label: '설정', desc: 'LLM & 인덱싱' },
];

/** 페이지 타이틀 매핑 */
const pageTitles: Record<string, string> = {
  '/': '다운로드 & 소개',
  '/dashboard': '대시보드',
  '/file-intelligence': '파일 인텔리전스',
  '/knowledge': '지식 엔진 (RAG)',
  '/study': '학습 & 컨텍스트 엔진',
  '/pricing': '요금제',
  '/settings': '설정',
  '/welcome': 'Local Intelligence Hub',
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // LLM 상태 조회
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await systemApi.config();
      return res.data;
    },
    retry: false,
    staleTime: 30000,
  });

  const currentTitle = pageTitles[location.pathname] || 'LIH';

  // 랜딩 페이지는 레이아웃 없이 렌더링
  if (location.pathname === '/welcome') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {/* 배경 글로우 효과 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
      </div>

      {/* 모바일 오버레이 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col
          glass border-r border-white/10
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* 브랜딩 */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-base font-bold text-white leading-tight">LIH</h1>
              <p className="text-[10px] text-gray-400 leading-tight">Local Intelligence Hub</p>
            </motion.div>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, desc }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-[10px] text-gray-500 leading-tight group-hover:text-gray-400">{desc}</p>
                </div>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* LLM 상태 + 접기 */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
              <Zap size={14} className={settingsData?.llm_provider === 'openai' ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="text-xs text-gray-400">
                {settingsData?.llm_provider === 'openai' ? 'OpenAI GPT' : settingsData?.llm_provider === 'ollama' ? 'Ollama 로컬' : '연결 대기'}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 glass border-b border-white/10">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">{currentTitle}</h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${settingsData?.llm_provider ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">
                {settingsData?.llm_model || 'AI Ready'}
              </span>
            </div>
          </div>
        </header>

        {/* 컨텐츠 */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
