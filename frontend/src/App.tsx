/**
 * LIH (Local Intelligence Hub) - 데스크톱 앱 라우터 (DMG 브랜치).
 * 로컬 전용: 다운로드 페이지 없이 대시보드를 기본 화면으로 사용.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import FileIntelligencePage from './pages/FileIntelligencePage';
import KnowledgePage from './pages/KnowledgePage';
import StudyPage from './pages/StudyPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/file-intelligence" element={<FileIntelligencePage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-gray-800 !text-white !border !border-white/10 !shadow-xl',
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
