import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fileIntelligenceApi } from '../services/api';
import FolderPathInput from '../components/FolderPathInput';
import { FolderOpen, Loader2, CheckCircle } from 'lucide-react';

export default function FileIntelligencePage() {
  const [rootPath, setRootPath] = useState('');
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.scan(rootPath),
    onSuccess: (res) => {
      setScanJobId(res.data.job_id);
    },
  });

  const planMutation = useMutation({
    mutationFn: () => fileIntelligenceApi.plan(scanJobId!),
    onSuccess: (res) => setPlanId(res.data.plan_id),
    enabled: !!scanJobId,
  });

  const { data: scanResult } = useQuery({
    queryKey: ['scan', scanJobId],
    queryFn: () => fileIntelligenceApi.getScan(scanJobId!).then((r) => r.data),
    enabled: !!scanJobId,
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">파일 인텔리전스</h2>
        <p className="text-gray-600 mt-1">
          폴더를 스캔하고 AI가 제안하는 정리 계획을 생성합니다. 적용 전 미리보기를 확인하세요.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">1. 폴더 스캔</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FolderPathInput
              value={rootPath}
              onChange={setRootPath}
              placeholder="스캔할 폴더 경로 (예: /Users/me/Documents)"
            />
          </div>
          <button
            onClick={() => scanMutation.mutate()}
            disabled={!rootPath.trim() || scanMutation.isPending}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            {scanMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
            스캔
          </button>
        </div>
        {scanMutation.isError && (
          <p className="text-red-600 mt-2 text-sm">
            {(scanMutation.error as Error).message}
          </p>
        )}
      </section>

      {scanJobId && scanResult && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">2. 스캔 결과</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">파일 수</p>
              <p className="text-xl font-semibold">{scanResult.total_files}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">폴더 수</p>
              <p className="text-xl font-semibold">{scanResult.total_dirs}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">총 크기</p>
              <p className="text-xl font-semibold">
                {(scanResult.total_size_bytes / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => planMutation.mutate()}
            disabled={planMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {planMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            AI 정리 계획 생성
          </button>
        </section>
      )}

      {planId && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">3. 재구성 계획</h3>
          <p className="text-sm text-gray-600">계획 ID: {planId}</p>
          <p className="text-sm text-gray-500 mt-2">
            /api/v1/file-intelligence/preview 로 미리보기, /apply 로 적용할 수 있습니다.
          </p>
        </section>
      )}
    </div>
  );
}
