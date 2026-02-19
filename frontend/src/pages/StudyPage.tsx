/**
 * 학습 엔진: 개념 추출, 요약, 질문 생성, 면접 질문, 학습 계획.
 * 탭 기반 결과 표시 + 플래시카드 UI.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Loader2,
  BookOpen,
  Lightbulb,
  HelpCircle,
  CalendarCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FolderOpen,
  Play,
} from 'lucide-react';
import { studyApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import FileUploadZone from '../components/FileUploadZone';

interface Concept { name: string; description?: string; relevance?: number; }
interface Question { question: string; type?: string; options?: string[]; answer?: string; }
interface InterviewQuestion { question: string; hint?: string; expected_answer?: string; }
interface PlanStep { order?: number; title: string; description?: string; estimated_minutes?: number; concepts?: string[]; }

type TabKey = 'summary' | 'concepts' | 'questions' | 'interview' | 'plan';

const tabs: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: 'summary', label: '요약', icon: BookOpen },
  { key: 'concepts', label: '개념', icon: Lightbulb },
  { key: 'questions', label: '질문', icon: HelpCircle },
  { key: 'interview', label: '면접', icon: Briefcase },
  { key: 'plan', label: '학습 계획', icon: CalendarCheck },
];

/** 플래시카드 (뒤집기) */
function FlashCard({ front, back, delay }: { front: string; back: string; delay: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => setFlipped(!flipped)}
      className="cursor-pointer glass-card-hover p-4 min-h-[100px] flex items-center justify-center text-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={flipped ? 'back' : 'front'}
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: -90 }}
          transition={{ duration: 0.2 }}
        >
          {flipped ? (
            <p className="text-sm text-gray-300">{back}</p>
          ) : (
            <p className="font-medium text-white">{front}</p>
          )}
        </motion.div>
      </AnimatePresence>
      <span className="absolute bottom-2 right-3 text-[9px] text-gray-600">탭하여 뒤집기</span>
    </motion.div>
  );
}

/** 접이식 답변 */
function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StudyPage() {
  const [rootPath, setRootPath] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [inputMode, setInputMode] = useState<'upload' | 'folder'>('folder');
  const [summary, setSummary] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [interviewQs, setInterviewQs] = useState<InterviewQuestion[] | null>(null);
  const [studyPlan, setStudyPlan] = useState<{ plan: PlanStep[]; estimated_duration_minutes?: number } | null>(null);

  const summaryMutation = useMutation({
    mutationFn: () => studyApi.summary(rootPath),
    onSuccess: (res) => { setSummary(res.data.summary); setActiveTab('summary'); toast.success('요약 생성 완료'); },
    onError: () => toast.error('요약 생성 실패'),
  });
  const conceptsMutation = useMutation({
    mutationFn: () => studyApi.concepts(rootPath),
    onSuccess: (res) => { setConcepts(res.data.concepts ?? []); setActiveTab('concepts'); toast.success('개념 추출 완료'); },
    onError: () => toast.error('개념 추출 실패'),
  });
  const questionsMutation = useMutation({
    mutationFn: () => studyApi.questions(rootPath),
    onSuccess: (res) => { setQuestions(res.data.questions ?? []); setActiveTab('questions'); toast.success('질문 생성 완료'); },
    onError: () => toast.error('질문 생성 실패'),
  });
  const interviewMutation = useMutation({
    mutationFn: () => studyApi.interviewQuestions(rootPath),
    onSuccess: (res) => { setInterviewQs(res.data.questions ?? []); setActiveTab('interview'); toast.success('면접 질문 생성 완료'); },
    onError: () => toast.error('면접 질문 생성 실패'),
  });
  const planMutation = useMutation({
    mutationFn: () => studyApi.plan(rootPath),
    onSuccess: (res) => { setStudyPlan(res.data); setActiveTab('plan'); toast.success('학습 계획 생성 완료'); },
    onError: () => toast.error('학습 계획 생성 실패'),
  });

  const disabled = !rootPath.trim();
  const anyLoading = summaryMutation.isPending || conceptsMutation.isPending || questionsMutation.isPending || interviewMutation.isPending || planMutation.isPending;

  const actionButtons = [
    { key: 'summary' as TabKey, label: '요약', icon: BookOpen, mutation: summaryMutation },
    { key: 'concepts' as TabKey, label: '개념 추출', icon: Lightbulb, mutation: conceptsMutation },
    { key: 'questions' as TabKey, label: '질문 생성', icon: HelpCircle, mutation: questionsMutation },
    { key: 'interview' as TabKey, label: '면접 질문', icon: Briefcase, mutation: interviewMutation },
    { key: 'plan' as TabKey, label: '학습 계획', icon: CalendarCheck, mutation: planMutation },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 파일 입력 */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <Sparkles size={18} className="text-purple-400" />
          <h3 className="font-semibold text-white">학습할 파일</h3>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/5">
            {(['upload', 'folder'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setInputMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  inputMode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'upload' ? '파일 업로드' : '폴더 경로'}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-2xl">
          {inputMode === 'upload' ? (
            <FileUploadZone onUploadComplete={(path) => setRootPath(path)} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FolderPathInput value={rootPath} onChange={setRootPath} placeholder="학습할 폴더 경로 (예: /Users/이름/Documents)" />
              </div>
              <button
                onClick={() => summaryMutation.mutate()}
                disabled={disabled || anyLoading}
                className="btn-primary text-sm py-2 shrink-0"
              >
                {anyLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                전체 분석
              </button>
            </div>
          )}
        </div>
        {rootPath.trim() && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <FolderOpen size={12} />
            {rootPath} — 아래 버튼으로 개별 분석도 가능합니다
          </p>
        )}
        {!rootPath.trim() && inputMode === 'folder' && (
          <p className="text-xs text-gray-500 mt-2">폴더 경로를 입력하면 AI가 파일을 분석합니다</p>
        )}
      </motion.section>

      {/* 기능 버튼 */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">AI 학습 도구</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actionButtons.map(({ key, label, icon: Icon, mutation }) => (
            <button
              key={key}
              onClick={() => mutation.mutate()}
              disabled={disabled || mutation.isPending}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                activeTab === key && !mutation.isPending
                  ? 'border-indigo-500/30 bg-indigo-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              } disabled:opacity-50`}
            >
              {mutation.isPending ? <Loader2 size={22} className="animate-spin text-indigo-400" /> : <Icon size={22} className="text-indigo-400" />}
              <span className="text-xs font-medium text-white">{label}</span>
            </button>
          ))}
        </div>
        {anyLoading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-300">
            <Loader2 size={14} className="animate-spin" />
            AI가 분석 중입니다...
          </div>
        )}
      </motion.section>

      {/* 결과 탭 */}
      <div className="glass-card overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex border-b border-white/5 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === key
                  ? 'border-indigo-500 text-white bg-white/5'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            {/* 요약 */}
            {activeTab === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {summary ? (
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{summary}</p>
                ) : (
                  <EmptyState text="요약 생성 버튼을 눌러주세요" />
                )}
              </motion.div>
            )}

            {/* 개념 */}
            {activeTab === 'concepts' && (
              <motion.div key="concepts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {concepts && concepts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {concepts.map((c, i) => (
                      <FlashCard
                        key={i}
                        front={c.name}
                        back={c.description || '설명 없음'}
                        delay={i * 0.05}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="개념 추출 버튼을 눌러주세요" />
                )}
              </motion.div>
            )}

            {/* 학습 질문 */}
            {activeTab === 'questions' && (
              <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {questions && questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-white font-medium mb-2">Q{i + 1}. {q.question}</p>
                        {q.options && q.options.length > 0 && (
                          <ul className="ml-4 mb-2 space-y-1">
                            {q.options.map((opt, j) => (
                              <li key={j} className="text-gray-400 text-sm">{opt}</li>
                            ))}
                          </ul>
                        )}
                        {q.answer && (
                          <Expandable label="정답 보기">
                            <p className="text-sm text-emerald-300 mt-1 pl-4">{q.answer}</p>
                          </Expandable>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="질문 생성 버튼을 눌러주세요" />
                )}
              </motion.div>
            )}

            {/* 면접 질문 */}
            {activeTab === 'interview' && (
              <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {interviewQs && interviewQs.length > 0 ? (
                  <div className="space-y-3">
                    {interviewQs.map((q, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-white font-medium mb-2">Q{i + 1}. {q.question}</p>
                        {q.hint && <p className="text-xs text-amber-300 mb-1">💡 힌트: {q.hint}</p>}
                        {q.expected_answer && (
                          <Expandable label="모범 답안 보기">
                            <p className="text-sm text-gray-300 mt-1 pl-4">{q.expected_answer}</p>
                          </Expandable>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="면접 질문 생성 버튼을 눌러주세요" />
                )}
              </motion.div>
            )}

            {/* 학습 계획 */}
            {activeTab === 'plan' && (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {studyPlan && studyPlan.plan.length > 0 ? (
                  <div>
                    {studyPlan.estimated_duration_minutes && (
                      <p className="text-sm text-gray-400 mb-4">예상 소요 시간: <span className="text-white font-medium">{studyPlan.estimated_duration_minutes}분</span></p>
                    )}
                    <div className="space-y-3">
                      {studyPlan.plan.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5"
                        >
                          <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold">
                            {step.order ?? i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{step.title}</p>
                            {step.description && <p className="text-sm text-gray-400 mt-1">{step.description}</p>}
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              {step.estimated_minutes && <span>⏱ {step.estimated_minutes}분</span>}
                              {step.concepts && step.concepts.length > 0 && (
                                <span>🏷 {step.concepts.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="학습 계획 생성 버튼을 눌러주세요" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <Sparkles size={36} className="mb-3 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
