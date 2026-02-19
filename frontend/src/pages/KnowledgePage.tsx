/**
 * 로컬 지식 (RAG): 로컬 폴더 인덱싱, 의미 검색·질의응답. 완전 로컬, 외부 전송 없음.
 */
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import { FolderOpen, Loader2, Search, AlertCircle } from 'lucide-react';

export default function KnowledgePage() {
  const [indexPath, setIndexPath] = useState('');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  // 인덱스 상태 조회 (인덱싱 중일 때 폴링)
  const { data: indexStatus } = useQuery({
    queryKey: ['indexStatus', lastJobId],
    queryFn: async () => {
      const res = await knowledgeApi.getIndexStatus(lastJobId!);
      return res.data;
    },
    enabled: !!lastJobId,
    refetchInterval: (query) =>
      (query.state.data as { status?: string })?.status === 'running' ? 1500 : false,
  });

  // 인덱싱된 문서 수 조회
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['knowledgeStats'],
    queryFn: async () => {
      const res = await knowledgeApi.getStats();
      return res.data;
    },
  });

  const indexMutation = useMutation({
    mutationFn: () => knowledgeApi.index(indexPath),
    onSuccess: (res) => {
      setLastJobId(res.data.job_id);
      setError(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : '인덱싱 시작 실패');
    },
  });

  const queryMutation = useMutation({
    mutationFn: () => knowledgeApi.query(query),
    onSuccess: (res) => {
      setAnswer(res.data.answer);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { detail?: string } })?.data?.detail
        : null;
      setError(msg || (err instanceof Error ? err.message : '질의 실패'));
      setAnswer(null);
    },
  });

  // 인덱싱 완료 시 stats 갱신
  useEffect(() => {
    if (indexStatus?.status === 'completed') {
      refetchStats();
      setLastJobId(null);
    }
    if (indexStatus?.status === 'failed') {
      setError(indexStatus.error || '인덱싱 실패');
    }
  }, [indexStatus?.status, indexStatus?.error, refetchStats]);

  const isIndexing = indexStatus?.status === 'running' || indexMutation.isPending;
  const hasData = (stats as { ready?: boolean })?.ready ?? false;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">로컬 지식 엔진 (RAG)</h2>
        <p className="text-gray-300 mt-1">
          인덱싱된 로컬 파일을 기반으로 질문에 답합니다. Ollama LLM이 출처와 함께 답변합니다.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-200">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:underline">닫기</button>
        </div>
      )}

      <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
        <h3 className="font-semibold text-white mb-4">인덱싱</h3>
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
        {isIndexing && (
          <p className="mt-3 text-sm text-amber-300">
            인덱싱 중… 완료될 때까지 기다린 후 질의해주세요.
            {typeof (indexStatus as { progress?: number })?.progress === 'number' && (
              <span> (진행률: {Math.round((indexStatus as { progress?: number }).progress! * 100)}%)</span>
            )}
          </p>
        )}
        {!hasData && !isIndexing && (
          <p className="mt-3 text-sm text-amber-300">
            인덱싱된 데이터가 없습니다. 폴더를 선택하고 인덱싱을 먼저 진행해주세요.
          </p>
        )}
        {hasData && (
          <p className="mt-3 text-sm text-green-300">
            인덱싱 완료. {(stats as { collection_count?: number })?.collection_count ?? 0}개 문서가 검색 가능합니다.
          </p>
        )}
      </section>

      <section className="bg-gray-800 rounded-xl border border-gray-600 p-6">
        <h3 className="font-semibold text-white mb-4">질의</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="질문을 입력하세요 (예: 이 프로젝트의 핵심 기능은?)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && queryMutation.mutate()}
            className="flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400 bg-gray-700"
          />
          <button
            onClick={() => queryMutation.mutate()}
            disabled={!query.trim() || queryMutation.isPending || isIndexing}
            title={isIndexing ? '인덱싱 완료 후 질의 가능' : undefined}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {queryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            검색
          </button>
        </div>
        {!hasData && !isIndexing && (
          <p className="mt-3 text-sm text-gray-400">질의하려면 먼저 인덱싱을 완료해주세요.</p>
        )}
        {answer && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-white mb-2">답변</p>
            <p className="text-gray-200 whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </section>
    </div>
  );
}
