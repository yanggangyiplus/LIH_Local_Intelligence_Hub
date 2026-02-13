import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FileSearch, BookOpen, GraduationCap, Settings } from 'lucide-react';
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
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'text-gray-600 hover:bg-gray-100'
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
