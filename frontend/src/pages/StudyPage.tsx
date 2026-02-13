import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { studyApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import { Loader2, BookOpen } from 'lucide-react';

export default function StudyPage() {
  const [rootPath, setRootPath] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  const summaryMutation = useMutation({
    mutationFn: () => studyApi.summary(rootPath),
    onSuccess: (res) => setSummary(res.data.summary),
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">학습 & 컨텍스트 엔진</h2>
        <p className="text-gray-600 mt-1">
          선택 폴더를 학습 공간으로 변환합니다. 개념 추출, 요약, 질문 생성, 학습 계획을 지원합니다.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">폴더 선택</h3>
        <div className="max-w-2xl">
          <FolderPathInput
            value={rootPath}
            onChange={setRootPath}
            placeholder="학습할 폴더 경로"
          />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">기능</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => summaryMutation.mutate()}
            disabled={!rootPath.trim() || summaryMutation.isPending}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
          >
            {summaryMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <BookOpen size={20} />}
            <div>
              <p className="font-medium">요약 생성</p>
              <p className="text-sm text-gray-500">폴더 내용 요약</p>
            </div>
          </button>
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <p className="font-medium">개념 추출</p>
            <p className="text-sm text-gray-500">API: /study/concepts</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <p className="font-medium">질문 생성</p>
            <p className="text-sm text-gray-500">API: /study/questions</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <p className="font-medium">학습 계획</p>
            <p className="text-sm text-gray-500">API: /study/plan</p>
          </div>
        </div>
      </section>

      {summary && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">요약</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
        </section>
      )}
    </div>
  );
}
