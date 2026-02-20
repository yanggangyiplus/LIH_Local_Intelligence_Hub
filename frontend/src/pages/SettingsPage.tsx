/**
 * 설정 페이지: LLM Provider 선택, API 키 입력, 모델 선택, 인덱싱 설정.
 * Gemini는 DMG(데스크톱) 전용으로 표시.
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Zap,
  Server,
  Key,
  Check,
  Loader2,
  RefreshCw,
  ChevronDown,
  Sparkles,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Briefcase,
  CalendarCheck,
  GripVertical,
} from 'lucide-react';
import { settingsApi } from '../services/api';

const ALL_STUDY_TOOLS = [
  { key: 'summary', label: '요약', icon: BookOpen },
  { key: 'concepts', label: '개념 추출', icon: Lightbulb },
  { key: 'questions', label: '질문 생성', icon: HelpCircle },
  { key: 'interview', label: '면접 질문', icon: Briefcase },
  { key: 'plan', label: '학습 계획', icon: CalendarCheck },
] as const;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [studyTools, setStudyTools] = useState<string[]>(['summary', 'concepts', 'questions', 'interview', 'plan']);

  const isTauri = useMemo(
    () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window,
    []
  );

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await settingsApi.get()).data,
  });

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm_provider);
      setModel(settings.openai_chat_model || 'gpt-4o-mini');
      setGeminiModel(settings.gemini_chat_model || 'gemini-2.0-flash');
      if (settings.study_tools) setStudyTools(settings.study_tools);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string | undefined>) =>
      settingsApi.update(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(`설정 저장 완료 (${res.data.active_provider}/${res.data.active_model})`);
    },
    onError: () => toast.error('설정 저장 실패'),
  });

  const handleSave = () => {
    const data: Record<string, unknown> = {
      llm_provider: provider,
      openai_chat_model: model,
      gemini_chat_model: geminiModel,
      study_tools: studyTools,
    };
    if (apiKey.trim()) data.openai_api_key = apiKey.trim();
    if (geminiApiKey.trim()) data.gemini_api_key = geminiApiKey.trim();
    updateMutation.mutate(data as Record<string, string | undefined>);
  };

  const toggleStudyTool = (key: string) => {
    setStudyTools(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* LLM Provider */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={20} className="text-indigo-400" />
          LLM Provider
        </h3>
        <div className={`grid grid-cols-1 ${isTauri ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
          {/* OpenAI */}
          <button
            onClick={() => setProvider('openai')}
            className={`p-4 rounded-xl border transition-all text-left ${
              provider === 'openai'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap size={18} className={provider === 'openai' ? 'text-indigo-400' : 'text-gray-500'} />
              <span className="font-medium text-white">OpenAI</span>
              {provider === 'openai' && <Check size={16} className="text-indigo-400 ml-auto" />}
            </div>
            <p className="text-xs text-gray-400">GPT-4o-mini / GPT-4o. 클라우드 기반, 빠르고 정확한 응답.</p>
            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              추천
            </span>
          </button>
          {/* Gemini - DMG(Tauri) 전용 */}
          {isTauri && (
            <button
              onClick={() => setProvider('gemini')}
              className={`p-4 rounded-xl border transition-all text-left ${
                provider === 'gemini'
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={18} className={provider === 'gemini' ? 'text-blue-400' : 'text-gray-500'} />
                <span className="font-medium text-white">Gemini</span>
                {provider === 'gemini' && <Check size={16} className="text-blue-400 ml-auto" />}
              </div>
              <p className="text-xs text-gray-400">Google Gemini 2.0 Flash / Pro. 빠른 응답, 대용량 컨텍스트.</p>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                데스크톱 전용
              </span>
            </button>
          )}
          {/* Ollama */}
          <button
            onClick={() => setProvider('ollama')}
            className={`p-4 rounded-xl border transition-all text-left ${
              provider === 'ollama'
                ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Server size={18} className={provider === 'ollama' ? 'text-amber-400' : 'text-gray-500'} />
              <span className="font-medium text-white">Ollama (로컬)</span>
              {provider === 'ollama' && <Check size={16} className="text-amber-400 ml-auto" />}
            </div>
            <p className="text-xs text-gray-400">llama3.2 등 로컬 모델. 완전 로컬 처리, 프라이버시 최대.</p>
            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              프라이버시
            </span>
          </button>
        </div>
      </motion.section>

      {/* OpenAI API Key */}
      {provider === 'openai' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={20} className="text-purple-400" />
            OpenAI API Key
          </h3>
          <div className="space-y-3">
            <input
              type="password"
              placeholder={settings?.openai_api_key_set ? '••••••••••••••••••••••••••••(설정됨)' : 'sk-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-glass"
            />
            <p className="text-xs text-gray-500">
              {settings?.openai_api_key_set
                ? 'API 키가 설정되어 있습니다. 변경하려면 새 키를 입력하세요.'
                : 'OpenAI 대시보드에서 API 키를 발급받으세요.'}
            </p>
          </div>
        </motion.section>
      )}

      {/* Gemini API Key */}
      {provider === 'gemini' && isTauri && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={20} className="text-blue-400" />
            Gemini API Key
          </h3>
          <div className="space-y-3">
            <input
              type="password"
              placeholder={settings?.gemini_api_key_set ? '••••••••••••••••••••••••••••(설정됨)' : 'AIza...'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="input-glass"
            />
            <p className="text-xs text-gray-500">
              {settings?.gemini_api_key_set
                ? 'Gemini API 키가 설정되어 있습니다. 변경하려면 새 키를 입력하세요.'
                : 'Google AI Studio에서 API 키를 발급받으세요.'}
            </p>
          </div>
        </motion.section>
      )}

      {/* Gemini 모델 선택 */}
      {provider === 'gemini' && isTauri && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Gemini 모델 선택</h3>
          <div className="relative">
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="input-glass appearance-none pr-10 cursor-pointer"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (빠르고 경제적)</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (가장 빠름)</option>
              <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash (최신, 추론 강화)</option>
              <option value="gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro (최고 성능)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </motion.section>
      )}

      {/* 모델 선택 */}
      {provider === 'openai' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">모델 선택</h3>
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input-glass appearance-none pr-10 cursor-pointer"
            >
              <option value="gpt-4o-mini">GPT-4o-mini (빠르고 경제적)</option>
              <option value="gpt-4o">GPT-4o (최고 성능)</option>
              <option value="gpt-4.1-mini">GPT-4.1-mini (최신)</option>
              <option value="o3-mini">o3-mini (추론 특화)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </motion.section>
      )}

      {/* 학습 도구 설정 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <GripVertical size={20} className="text-purple-400" />
          학습 도구 설정
        </h3>
        <p className="text-xs text-gray-500 mb-4">학습 엔진에 표시할 AI 도구를 선택하세요. 선택한 도구만 학습 페이지에 표시됩니다.</p>
        <div className="space-y-2">
          {ALL_STUDY_TOOLS.map(({ key, label, icon: Icon }) => {
            const enabled = studyTools.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleStudyTool(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  enabled
                    ? 'border-indigo-500/30 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                <Icon size={18} className={enabled ? 'text-indigo-400' : 'text-gray-500'} />
                <span className={`text-sm font-medium ${enabled ? 'text-white' : 'text-gray-400'}`}>{label}</span>
                <div className="ml-auto">
                  {enabled ? (
                    <Check size={16} className="text-indigo-400" />
                  ) : (
                    <div className="w-4 h-4 rounded border border-gray-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {studyTools.length === 0 && (
          <p className="text-xs text-amber-400 mt-2">최소 1개 이상의 도구를 선택해주세요.</p>
        )}
      </motion.section>

      {/* 현재 상태 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">현재 상태</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">활성 Provider</p>
            <p className="text-white font-medium">{settings?.llm_provider}</p>
          </div>
          <div>
            <p className="text-gray-500">활성 모델</p>
            <p className="text-white font-medium">{settings?.llm_model}</p>
          </div>
          <div>
            <p className="text-gray-500">청크 크기</p>
            <p className="text-white font-medium">{settings?.chunk_size}</p>
          </div>
          <div>
            <p className="text-gray-500">최대 파일 크기</p>
            <p className="text-white font-medium">{settings?.max_file_size_mb} MB</p>
          </div>
        </div>
      </motion.section>

      {/* 저장 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="btn-primary w-full py-3"
        >
          {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          설정 저장 & 적용
        </button>
      </motion.div>
    </div>
  );
}
