/**
 * 지식 엔진 (RAG): 채팅 UI 기반 질의응답 + 인덱싱 관리.
 * SSE 스트리밍, 멀티턴 대화, 출처 문서 표시.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FolderOpen,
  Loader2,
  Send,
  Bot,
  User,
  Database,
  FileText,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { knowledgeApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import FileUploadZone from '../components/FileUploadZone';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ file_path: string; score: number; content: string }>;
  streaming?: boolean;
}

export default function KnowledgePage() {
  const [indexPath, setIndexPath] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'folder'>('folder');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 인덱스 상태 폴링
  const { data: indexStatus } = useQuery({
    queryKey: ['indexStatus', lastJobId],
    queryFn: async () => (await knowledgeApi.getIndexStatus(lastJobId!)).data,
    enabled: !!lastJobId,
    refetchInterval: (query) =>
      (query.state.data as { status?: string })?.status === 'running' ? 1500 : false,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['knowledgeStats'],
    queryFn: async () => (await knowledgeApi.getStats()).data,
  });

  const indexMutation = useMutation({
    mutationFn: () => knowledgeApi.index(indexPath),
    onSuccess: (res) => {
      setLastJobId(res.data.job_id);
      toast.success('인덱싱 시작!');
    },
    onError: () => toast.error('인덱싱 시작 실패'),
  });

  useEffect(() => {
    if (indexStatus?.status === 'completed') {
      refetchStats();
      setLastJobId(null);
      toast.success('인덱싱 완료!');
    }
    if (indexStatus?.status === 'failed') {
      toast.error(indexStatus.error || '인덱싱 실패');
    }
  }, [indexStatus?.status, indexStatus?.error, refetchStats]);

  // 스크롤 관리
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isIndexing = indexStatus?.status === 'running' || indexMutation.isPending;
  const hasData = (stats as { ready?: boolean })?.ready ?? false;

  /** SSE 스트리밍 질의 */
  const handleSendMessage = useCallback(async () => {
    if (!query.trim() || isStreaming) return;
    const userMsg = query.trim();
    setQuery('');

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // 어시스턴트 스트리밍 시작
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await fetch(`${apiBase}/knowledge/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg,
          scope: indexPath.trim() ? 'folder' : 'all',
          scope_path: indexPath.trim() || undefined,
          top_k: 8,
        }),
      });

      if (!response.ok) throw new Error('스트리밍 요청 실패');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('스트림 읽기 실패');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let sources: ChatMessage['sources'] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'sources' && data.chunks) {
              sources = data.chunks.map((c: { file_path: string; score: number; content: string }) => ({
                file_path: c.file_path, score: c.score, content: c.content,
              }));
            } else if (data.type === 'token' && data.content) {
              fullContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent, sources, streaming: true };
                return updated;
              });
            } else if (data.type === 'done') {
              break;
            }
          } catch { /* ignore parse errors in stream */ }
        }
      }

      // 스트리밍 완료
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullContent || '답변을 생성할 수 없습니다.', sources, streaming: false };
        return updated;
      });
    } catch (err) {
      // SSE 실패 시 일반 API로 폴백
      try {
        const res = await knowledgeApi.query(userMsg);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: res.data.answer, streaming: false };
          return updated;
        });
      } catch {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '질의 중 오류가 발생했습니다.', streaming: false };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [query, isStreaming]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl">
      {/* 인덱싱 패널 */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 mb-4 shrink-0"
      >
        {/* 탭: 업로드 / 폴더 경로 */}
        <div className="flex items-center gap-4 mb-3">
          <Database size={18} className="text-indigo-400 shrink-0" />
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 ml-auto">
            <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">
              {isIndexing ? '인덱싱 중...' : hasData ? `${(stats as { collection_count?: number })?.collection_count ?? 0}개 문서 준비` : '인덱싱 필요'}
            </span>
          </div>
        </div>

        {inputMode === 'upload' ? (
          <FileUploadZone
            onUploadComplete={(path) => {
              setIndexPath(path);
              indexMutation.mutate();
            }}
            disabled={isIndexing}
          />
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <FolderPathInput value={indexPath} onChange={setIndexPath} placeholder="인덱싱할 폴더 경로" />
            </div>
            <button
              onClick={() => indexMutation.mutate()}
              disabled={!indexPath.trim() || isIndexing}
              className="btn-primary text-sm py-2"
            >
              {isIndexing ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />}
              인덱싱
            </button>
          </div>
        )}
      </motion.section>

      {/* 채팅 영역 */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Bot size={48} className="text-indigo-400/30 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">AI 지식 어시스턴트</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                인덱싱된 로컬 파일을 기반으로 질문에 답합니다. 폴더를 인덱싱한 후 질문을 입력하세요.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['이 프로젝트는 뭐야?', '핵심 기능을 설명해줘', '아키텍처 구조는?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); }}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-white" />
                    </div>
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                      : 'bg-white/5 border border-white/5 text-gray-200 rounded-bl-md'
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-indigo-400 rounded-sm animate-pulse ml-0.5" />
                    )}
                  </div>
                  {/* 출처 문서 */}
                  {msg.sources && msg.sources.length > 0 && !msg.streaming && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.sources.slice(0, 4).map((s, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-gray-400" title={s.file_path}>
                          <FileText size={10} />
                          {s.file_path.split('/').pop()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <User size={16} className="text-gray-300" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* 입력 바 */}
        <div className="p-4 border-t border-white/5">
          {!hasData && !isIndexing && (
            <div className="flex items-center gap-2 mb-3 text-xs text-amber-400">
              <AlertCircle size={14} />
              인덱싱된 데이터가 없습니다. 위에서 폴더를 인덱싱해주세요.
            </div>
          )}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder={isStreaming ? 'AI가 답변 중...' : '질문을 입력하세요...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isStreaming}
              className="input-glass flex-1"
            />
            <button
              onClick={handleSendMessage}
              disabled={!query.trim() || isStreaming}
              className="btn-primary px-4"
            >
              {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="btn-ghost px-3"
                title="대화 초기화"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
