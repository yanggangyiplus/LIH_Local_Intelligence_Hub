import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { knowledgeApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import { FolderOpen, Loader2, Search } from 'lucide-react';

export default function KnowledgePage() {
  const [indexPath, setIndexPath] = useState('');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const indexMutation = useMutation({
    mutationFn: () => knowledgeApi.index(indexPath),
    onSuccess: (res) => alert(`인덱싱 시작: job_id=${res.data.job_id}`),
  });

  const queryMutation = useMutation({
    mutationFn: () => knowledgeApi.query(query),
    onSuccess: (res) => setAnswer(res.data.answer),
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">로컬 지식 엔진 (RAG)</h2>
        <p className="text-gray-600 mt-1">
          인덱싱된 로컬 파일을 기반으로 질문에 답합니다. Ollama LLM이 출처와 함께 답변합니다.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">인덱싱</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FolderPathInput
              value={indexPath}
              onChange={setIndexPath}
              placeholder="인덱싱할 폴더 경로"
            />
          </div>
          <button
            onClick={() => indexMutation.mutate()}
            disabled={!indexPath.trim() || indexMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {indexMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
            인덱싱 시작
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">질의</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="질문을 입력하세요 (예: 이 프로젝트의 핵심 기능은?)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && queryMutation.mutate()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => queryMutation.mutate()}
            disabled={!query.trim() || queryMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {queryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            검색
          </button>
        </div>
        {answer && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">답변</p>
            <p className="text-gray-900 whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </section>
    </div>
  );
}
