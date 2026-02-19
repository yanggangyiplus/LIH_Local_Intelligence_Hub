/**
 * Study & Context Engine: 개념 추출, 요약, 질문 생성, 학습 계획, 면접 질문.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { studyApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import { Loader2, BookOpen, Lightbulb, HelpCircle, CalendarCheck, Briefcase } from 'lucide-react';

interface Concept {
  id?: string;
  name: string;
  description?: string;
  relevance?: number;
}

interface Question {
  question: string;
  type?: string;
  options?: string[];
  answer?: string;
}

interface InterviewQuestion {
  question: string;
  hint?: string;
  expected_answer?: string;
}

interface PlanStep {
  order?: number;
  title: string;
  description?: string;
  estimated_minutes?: number;
  concepts?: string[];
}

export default function StudyPage() {
  const [rootPath, setRootPath] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [interviewQs, setInterviewQs] = useState<InterviewQuestion[] | null>(null);
  const [studyPlan, setStudyPlan] = useState<{ plan: PlanStep[]; estimated_duration_minutes?: number } | null>(null);

  const summaryMutation = useMutation({
    mutationFn: () => studyApi.summary(rootPath),
    onSuccess: (res) => setSummary(res.data.summary),
  });

  const conceptsMutation = useMutation({
    mutationFn: () => studyApi.concepts(rootPath),
    onSuccess: (res) => setConcepts(res.data.concepts ?? []),
  });

  const questionsMutation = useMutation({
    mutationFn: () => studyApi.questions(rootPath),
    onSuccess: (res) => setQuestions(res.data.questions ?? []),
  });

  const interviewMutation = useMutation({
    mutationFn: () => studyApi.interviewQuestions(rootPath),
    onSuccess: (res) => setInterviewQs(res.data.questions ?? []),
  });

  const planMutation = useMutation({
    mutationFn: () => studyApi.plan(rootPath),
    onSuccess: (res) => setStudyPlan(res.data),
  });

  const disabled = !rootPath.trim();

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">학습 & 컨텍스트 엔진</h2>
        <p className="text-gray-300 mt-1">
          선택 폴더를 학습 공간으로 변환합니다. 개념 추출, 요약, 질문 생성, 학습 계획을 지원합니다.
        </p>
      </header>

      <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
        <h3 className="font-semibold text-white mb-4">폴더 선택</h3>
        <div className="max-w-2xl">
          <FolderPathInput
            value={rootPath}
            onChange={setRootPath}
            placeholder="학습할 폴더 경로"
          />
        </div>
      </section>

      <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
        <h3 className="font-semibold text-white mb-4">기능</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => summaryMutation.mutate()}
            disabled={disabled || summaryMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left text-white"
          >
            {summaryMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <BookOpen size={20} />}
            <div>
              <p className="font-medium">요약 생성</p>
              <p className="text-sm text-gray-400">폴더 내용 요약</p>
            </div>
          </button>
          <button
            onClick={() => conceptsMutation.mutate()}
            disabled={disabled || conceptsMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left text-white"
          >
            {conceptsMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Lightbulb size={20} />}
            <div>
              <p className="font-medium">개념 추출</p>
              <p className="text-sm text-gray-400">핵심 개념·키워드 추출</p>
            </div>
          </button>
          <button
            onClick={() => questionsMutation.mutate()}
            disabled={disabled || questionsMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left text-white"
          >
            {questionsMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <HelpCircle size={20} />}
            <div>
              <p className="font-medium">질문 생성</p>
              <p className="text-sm text-gray-400">학습용 질문 자동 생성</p>
            </div>
          </button>
          <button
            onClick={() => interviewMutation.mutate()}
            disabled={disabled || interviewMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left text-white"
          >
            {interviewMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Briefcase size={20} />}
            <div>
              <p className="font-medium">면접 질문</p>
              <p className="text-sm text-gray-400">기술 면접 질문 생성</p>
            </div>
          </button>
          <button
            onClick={() => planMutation.mutate()}
            disabled={disabled || planMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left text-white"
          >
            {planMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
            <div>
              <p className="font-medium">학습 계획</p>
              <p className="text-sm text-gray-400">단계별 학습 계획 생성</p>
            </div>
          </button>
        </div>
      </section>

      {/* 요약 결과 */}
      {summary && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">요약</h3>
          <p className="text-gray-200 whitespace-pre-wrap">{summary}</p>
        </section>
      )}

      {/* 개념 추출 결과 */}
      {concepts && concepts.length > 0 && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">추출된 개념 ({concepts.length}개)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {concepts.map((c, i) => (
              <div key={i} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{c.name}</span>
                  {c.relevance && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-900/50 text-indigo-200 rounded-full">
                      관련도 {c.relevance}/5
                    </span>
                  )}
                </div>
                {c.description && <p className="text-sm text-gray-300">{c.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 학습 질문 결과 */}
      {questions && questions.length > 0 && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">학습 질문 ({questions.length}개)</h3>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="p-4 bg-gray-700 rounded-lg">
                <p className="text-white font-medium mb-2">Q{i + 1}. {q.question}</p>
                {q.options && q.options.length > 0 && (
                  <ul className="ml-4 mb-2 space-y-1">
                    {q.options.map((opt, j) => (
                      <li key={j} className="text-gray-300 text-sm">{opt}</li>
                    ))}
                  </ul>
                )}
                {q.answer && (
                  <p className="text-sm text-emerald-300 mt-1">정답: {q.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 면접 질문 결과 */}
      {interviewQs && interviewQs.length > 0 && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">면접 질문 ({interviewQs.length}개)</h3>
          <div className="space-y-4">
            {interviewQs.map((q, i) => (
              <div key={i} className="p-4 bg-gray-700 rounded-lg">
                <p className="text-white font-medium mb-2">Q{i + 1}. {q.question}</p>
                {q.hint && <p className="text-sm text-amber-300 mb-1">힌트: {q.hint}</p>}
                {q.expected_answer && <p className="text-sm text-gray-300">예상 답변: {q.expected_answer}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 학습 계획 결과 */}
      {studyPlan && studyPlan.plan.length > 0 && (
        <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
          <h3 className="font-semibold text-white mb-4">
            학습 계획
            {studyPlan.estimated_duration_minutes && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                (예상 {studyPlan.estimated_duration_minutes}분)
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {studyPlan.plan.map((step, i) => (
              <div key={i} className="flex gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-indigo-600 text-white text-sm font-bold">
                  {step.order ?? i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{step.title}</p>
                  {step.description && <p className="text-sm text-gray-300 mt-1">{step.description}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {step.estimated_minutes && <span>{step.estimated_minutes}분</span>}
                    {step.concepts && step.concepts.length > 0 && (
                      <span>개념: {step.concepts.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
