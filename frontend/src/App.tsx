/**
 * LIH (Local Intelligence Hub) - 메인 앱 라우터.
 * 글래스모피즘 UI + framer-motion 페이지 전환.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import FileIntelligencePage from './pages/FileIntelligencePage';
import KnowledgePage from './pages/KnowledgePage';
import StudyPage from './pages/StudyPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';

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
            <Route path="/" element={<DownloadPage />} />
            <Route path="/welcome" element={<LandingPage />} />
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
