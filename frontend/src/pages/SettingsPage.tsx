/**
 * 설정 페이지: LLM Provider 선택, API 키 입력, 모델 선택, 인덱싱 설정.
 */
import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { settingsApi } from '../services/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await settingsApi.get()).data,
  });

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm_provider);
      setModel(settings.openai_chat_model || 'gpt-4o-mini');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: { llm_provider?: string; openai_api_key?: string; openai_chat_model?: string }) =>
      settingsApi.update(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(`설정 저장 완료 (${res.data.active_provider}/${res.data.active_model})`);
    },
    onError: () => toast.error('설정 저장 실패'),
  });

  const handleSave = () => {
    const data: { llm_provider?: string; openai_api_key?: string; openai_chat_model?: string } = {
      llm_provider: provider,
      openai_chat_model: model,
    };
    if (apiKey.trim()) data.openai_api_key = apiKey.trim();
    updateMutation.mutate(data);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* 현재 상태 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
