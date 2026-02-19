/**
 * 랜딩 페이지: 첫 방문자용 히어로 + 기능 소개 + CTA.
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileSearch,
  BookOpen,
  GraduationCap,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  Brain,
  Undo2,
} from 'lucide-react';

const features = [
  {
    icon: FileSearch,
    title: '파일 인텔리전스',
    desc: 'AI가 폴더를 분석하고 최적의 정리 계획을 제안합니다. 미리보기 후 승인하면 자동 정리.',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: BookOpen,
    title: '지식 엔진 (RAG)',
    desc: '로컬 문서를 인덱싱하고 AI에게 질문하세요. 출처와 함께 정확한 답변을 받습니다.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: GraduationCap,
    title: '학습 엔진',
    desc: '핵심 개념 추출, 자동 요약, 학습 질문 생성. 면접 준비까지 한 곳에서.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const values = [
  { icon: Lock, title: '프라이버시', desc: '파일, 임베딩, AI 추론까지 로컬에서 처리. 외부 전송 없음.' },
  { icon: Brain, title: '하이브리드 AI', desc: 'OpenAI GPT + 로컬 Ollama. 상황에 맞게 선택.' },
  { icon: Undo2, title: '안전한 실행', desc: '이해→계획→미리보기→실행→되돌리기. 항상 제어 가능.' },
  { icon: Zap, title: '즉시 시작', desc: 'Ollama 설치 후 바로 사용. 복잡한 설정 없이 시작.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e1a] overflow-hidden">
      {/* 배경 글로우 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[150px]" />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">LIH</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">
          시작하기 <ArrowRight size={16} />
        </button>
      </header>

      {/* 히어로 */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <Shield size={14} className="text-emerald-400" />
            <span className="text-sm text-gray-300">Privacy-First AI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            당신의 로컬 파일에<br />
            <span className="gradient-text">AI를 더하세요</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            클라우드 업로드 없이, 로컬 파일만으로 AI 기반 파일 정리, 지식 검색, 학습 지원을 제공합니다.
            당신의 데이터는 당신의 컴퓨터에만 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-3">
              <Sparkles size={18} /> 무료로 시작하기
            </button>
            <button onClick={() => navigate('/pricing')} className="btn-secondary text-base px-8 py-3">
              요금제 보기
            </button>
          </div>
        </motion.div>
      </section>

      {/* 3대 기능 */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="glass-card p-6 group hover:border-white/20 transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} mb-4 shadow-lg`}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          왜 <span className="gradient-text">LIH</span>인가요?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="glass-card p-5 text-center"
            >
              <v.icon size={28} className="text-indigo-400 mx-auto mb-3" />
              <h4 className="font-semibold text-white mb-1">{v.title}</h4>
              <p className="text-xs text-gray-400">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-10 text-center bg-gradient-to-br from-indigo-600/10 to-purple-600/10"
        >
          <h2 className="text-2xl font-bold text-white mb-3">지금 바로 시작하세요</h2>
          <p className="text-gray-400 mb-6">설치 후 3분이면 첫 번째 AI 분석을 경험할 수 있습니다.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-10 py-3">
            대시보드로 이동 <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10 text-center py-8 border-t border-white/5">
        <p className="text-xs text-gray-500">
          Local Intelligence Hub (LIH) — Privacy-first AI Workspace
        </p>
      </footer>
    </div>
  );
}
