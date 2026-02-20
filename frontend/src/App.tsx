/**
 * LIH (Local Intelligence Hub) - 데스크톱 앱 라우터 (DMG 브랜치).
 * 로컬 전용: 다운로드 페이지 없이 대시보드를 기본 화면으로 사용.
 */
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import FileIntelligencePage from './pages/FileIntelligencePage';
import KnowledgePage from './pages/KnowledgePage';
import StudyPage from './pages/StudyPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import { systemApi } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, retryDelay: 1500, staleTime: 10000 },
  },
});

/** DMG 환경에서 백엔드 sidecar 시작 대기 */
function useBackendReady() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const [ready, setReady] = useState(!isTauri);

  const check = useCallback(async () => {
    try {
      await systemApi.health();
      setReady(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 30; i++) {
        if (cancelled) return;
        if (await check()) return;
        await new Promise(r => setTimeout(r, 1000));
      }
      setReady(true);
    };
    poll();
    return () => { cancelled = true; };
  }, [ready, check]);

  return ready;
}

function App() {
  const backendReady = useBackendReady();

  if (!backendReady) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-indigo-400 mx-auto" size={48} />
          <p className="text-white text-lg font-medium">백엔드 시작 중...</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

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
