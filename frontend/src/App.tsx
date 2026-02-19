/**
 * LIH (Local Intelligence Hub) - 로컬 우선 AI 워크스페이스
 *
 * 핵심 엔진 3종:
 * - 파일 인텔리전스: 스캔 → AI 정리 계획 → 미리보기 → 승인 후 실행, 작업 로그(Undo)
 * - 로컬 지식 (RAG): 로컬 인덱싱, 의미 검색·질의응답 (외부 전송 없음)
 * - 학습 엔진: 개념 추출, 요약, 질문/학습 계획
 * 흐름: 이해 → 판단 → 계획 → 실행 → 되돌리기(Undo)
 */
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FileSearch, BookOpen, GraduationCap } from 'lucide-react';
import FileIntelligencePage from './pages/FileIntelligencePage';
import KnowledgePage from './pages/KnowledgePage';
import StudyPage from './pages/StudyPage';
import Layout from './components/Layout';
import clsx from 'clsx';

const navItems = [
  { to: '/file-intelligence', icon: FileSearch, label: '파일 인텔리전스' },
  { to: '/knowledge', icon: BookOpen, label: '로컬 지식 (RAG)' },
  { to: '/study', icon: GraduationCap, label: '학습 엔진' },
];

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout
        sidebar={
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-white hover:bg-gray-700'
                  )
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </nav>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/file-intelligence" replace />} />
          <Route path="/file-intelligence" element={<FileIntelligencePage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/study" element={<StudyPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
