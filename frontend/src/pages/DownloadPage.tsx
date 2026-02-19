/**
 * 다운로드 & 소개 페이지 — 사이트 첫 화면.
 * 데스크톱 앱 다운로드 + 웹 기능 안내.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Monitor,
  Globe,
  Shield,
  Brain,
  FolderSearch,
  BookOpen,
  GraduationCap,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Apple,
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

/** 기능 비교: 데스크톱 vs 웹 */
const featureComparison = [
  { feature: 'AI 채팅 (RAG 질의응답)', desktop: true, web: true },
  { feature: 'AI 학습 엔진 (요약·개념·질문)', desktop: true, web: true },
  { feature: '파일 업로드 & 인덱싱', desktop: true, web: true },
  { feature: '로컬 폴더 직접 스캔', desktop: true, web: false },
  { feature: '파일 인텔리전스 (AI 정리)', desktop: true, web: false },
  { feature: '완전 오프라인 (프라이버시)', desktop: true, web: false },
  { feature: 'Undo (파일 정리 되돌리기)', desktop: true, web: false },
];

export default function DownloadPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16">
      {/* 히어로 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
        className="text-center pt-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <Brain size={14} />
          AI-Powered Local Workspace
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Local Intelligence Hub
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          클라우드 업로드 없이 <span className="text-indigo-400 font-semibold">로컬 파일</span>을 AI가 정리·검색·학습해주는
          <br className="hidden sm:block" />
          프라이버시 우선 AI 워크스페이스
        </p>
      </motion.section>

      {/* 다운로드 카드 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15, duration: 0.5 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* macOS */}
        <div className="glass-card p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
            <Apple size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">macOS</h3>
          <p className="text-sm text-gray-400 mb-4">Apple Silicon (M1/M2/M3/M4)</p>
          <a
            href="https://github.com/yanggangyiplus/LIH_Local_Intelligence_Hub/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full py-3 text-sm justify-center"
          >
            <Download size={18} />
            .dmg 다운로드
          </a>
          <p className="text-xs text-gray-500 mt-2">v0.1.0 · ~25MB · macOS 13+</p>
        </div>

        {/* Windows */}
        <div className="glass-card p-6 flex flex-col items-center text-center opacity-70">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <Monitor size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Windows</h3>
          <p className="text-sm text-gray-400 mb-4">Windows 10/11 (x64)</p>
          <button disabled className="btn-secondary w-full py-3 text-sm justify-center opacity-50 cursor-not-allowed">
            <Clock size={18} />
            .exe 준비 중
          </button>
          <p className="text-xs text-gray-500 mt-2">추후 업데이트 예정입니다</p>
        </div>
      </motion.section>

      {/* 핵심 기능 소개 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-8">핵심 기능</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: FolderSearch, title: '파일 인텔리전스', desc: 'AI가 파일을 분석하고 최적 구조로 정리. 미리보기 후 승인, 실행 취소 가능.', tag: '데스크톱 전용' },
            { icon: BookOpen, title: '지식 엔진 (RAG)', desc: '파일을 인덱싱하면 AI 채팅으로 내용 검색·질의응답. 출처 문서도 표시.', tag: '웹 + 데스크톱' },
            { icon: GraduationCap, title: '학습 엔진', desc: '문서에서 개념 추출, 요약, 학습 질문, 면접 질문, 학습 계획 자동 생성.', tag: '웹 + 데스크톱' },
          ].map((f, i) => (
            <div key={i} className="glass-card p-5">
              <f.icon size={24} className="text-indigo-400 mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{f.desc}</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-500">
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 데스크톱 vs 웹 비교 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-2">데스크톱 vs 웹</h2>
        <p className="text-sm text-gray-500 text-center mb-6">데스크톱 앱은 모든 기능, 웹은 핵심 AI 기능을 제공합니다</p>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">기능</th>
                <th className="text-center py-3 px-4 text-indigo-400 font-medium">
                  <div className="flex items-center justify-center gap-1.5"><Monitor size={14} /> 데스크톱</div>
                </th>
                <th className="text-center py-3 px-4 text-purple-400 font-medium">
                  <div className="flex items-center justify-center gap-1.5"><Globe size={14} /> 웹</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {featureComparison.map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 px-4 text-gray-300">{row.feature}</td>
                  <td className="py-2.5 px-4 text-center">
                    <CheckCircle size={16} className="inline text-emerald-400" />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.web ? (
                      <CheckCircle size={16} className="inline text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="inline text-gray-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* CTA: 웹에서 체험 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.6, duration: 0.5 }}
        className="glass-card p-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
          <Globe size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">지금 바로 웹에서 체험</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          파일을 업로드하면 AI 채팅, 요약, 학습 질문 등을 바로 사용할 수 있습니다.
          <br />
          다운로드 없이 핵심 AI 기능을 체험해보세요.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => navigate('/knowledge')} className="btn-primary py-2.5 px-6">
            <BookOpen size={18} /> AI 채팅 시작 <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/study')} className="btn-secondary py-2.5 px-6">
            <GraduationCap size={18} /> 학습 엔진 체험
          </button>
        </div>
      </motion.section>

      {/* 프라이버시 안내 */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.7, duration: 0.5 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Shield size={16} />
          데스크톱 앱은 모든 데이터를 로컬에서만 처리합니다. 외부 전송 없음.
        </div>
      </motion.section>
    </div>
  );
}
