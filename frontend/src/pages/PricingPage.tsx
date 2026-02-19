/**
 * 요금제 페이지: Free / Pro / Enterprise 3 tier 표시.
 * 수익모델 시연용.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Sparkles, Building2, Zap } from 'lucide-react';

interface PlanTier {
  name: string;
  price: string;
  period: string;
  desc: string;
  icon: typeof Zap;
  features: string[];
  cta: string;
  popular?: boolean;
  gradient: string;
}

const tiers: PlanTier[] = [
  {
    name: 'Free',
    price: '0',
    period: '영구 무료',
    desc: '로컬 AI로 기본 기능을 무료로 사용하세요.',
    icon: Zap,
    features: [
      'Ollama 로컬 AI',
      '파일 스캔 & 정리 (월 5회)',
      'RAG 질의응답 (월 20회)',
      '기본 학습 엔진',
      '완전 로컬 처리',
      'Tauri 데스크톱 앱',
    ],
    cta: '현재 플랜',
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Pro',
    price: '9,900',
    period: '월',
    desc: 'OpenAI GPT로 강력한 AI 분석을 경험하세요.',
    icon: Sparkles,
    features: [
      'OpenAI GPT-4o-mini / GPT-4o',
      '무제한 파일 스캔 & 정리',
      '무제한 RAG 질의응답',
      '스트리밍 채팅 UI',
      '고급 학습 엔진 (면접 질문)',
      '우선 고객 지원',
      '자동 태그 & 인사이트',
    ],
    cta: 'Pro 시작하기',
    popular: true,
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    name: 'Enterprise',
    price: '문의',
    period: '',
    desc: '팀과 조직을 위한 맞춤 솔루션.',
    icon: Building2,
    features: [
      'Pro 전체 기능 포함',
      '팀 공유 지식 베이스',
      'SSO & 접근 제어',
      '온프레미스 배포 지원',
      '전담 기술 지원',
      'SLA 보장',
      '맞춤 AI 모델 튜닝',
    ],
    cta: '영업팀 문의',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-3">
          심플한 <span className="gradient-text">요금제</span>
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          기본은 무료, 더 강력한 AI가 필요하면 Pro로 업그레이드하세요.
        </p>
      </motion.div>

      {/* 요금제 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
            className={`glass-card p-6 flex flex-col relative ${
              tier.popular ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10' : ''
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-lg">
                가장 인기
              </div>
            )}

            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${tier.gradient} mb-3`}>
                <tier.icon size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{tier.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{tier.desc}</p>
            </div>

            <div className="mb-6">
              {tier.price === '문의' ? (
                <p className="text-3xl font-bold text-white">문의</p>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400">&#8361;</span>
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && <span className="text-sm text-gray-400">/ {tier.period}</span>}
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-gray-300">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => tier.name === 'Free' ? navigate('/dashboard') : toast_coming_soon()}
              className={tier.popular ? 'btn-primary w-full' : 'btn-secondary w-full'}
            >
              {tier.cta}
            </button>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-8"
      >
        <h2 className="text-xl font-bold text-white mb-6 text-center">자주 묻는 질문</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { q: '무료 플랜으로도 충분한가요?', a: 'Ollama 로컬 AI로 핵심 기능을 모두 사용할 수 있습니다. OpenAI의 더 강력한 분석이 필요하면 Pro를 추천합니다.' },
            { q: '데이터가 외부로 전송되나요?', a: 'Free 플랜은 완전 로컬입니다. Pro 플랜의 OpenAI 연동 시에만 텍스트가 OpenAI API로 전송됩니다.' },
            { q: '언제든 해지할 수 있나요?', a: '네, 구독은 언제든 해지 가능하며 해지 후에도 Free 플랜으로 계속 사용 가능합니다.' },
            { q: 'Enterprise는 어떤 기업에 적합한가요?', a: '10인 이상 팀, 온프레미스 배포가 필요한 기업, 데이터 보안 정책이 엄격한 조직에 최적입니다.' },
          ].map(({ q, a }) => (
            <div key={q}>
              <h4 className="font-medium text-white mb-1">{q}</h4>
              <p className="text-sm text-gray-400">{a}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function toast_coming_soon() {
  toast('결제 시스템 준비 중입니다!');
}
