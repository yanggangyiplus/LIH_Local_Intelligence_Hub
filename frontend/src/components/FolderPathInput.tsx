import { useRef, useCallback, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { systemApi } from '../services/api';

interface FolderPathInputProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * 폴더 경로 입력 컴포넌트.
 * - 직접 입력 가능
 * - 폴더 선택: Tauri는 네이티브 다이얼로그, 브라우저는 백엔드 API(네이티브 다이얼로그) 호출
 */
export default function FolderPathInput({
  value,
  onChange,
  placeholder = '폴더 경로를 입력하거나 선택하세요',
  disabled = false,
  className = '',
  inputClassName = '',
}: FolderPathInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPicking, setIsPicking] = useState(false);

  /** Tauri 환경: 네이티브 폴더 다이얼로그 (플러그인 설치 시) */
  const handleTauriPick = useCallback(async () => {
    try {
      // @ts-expect-error - Tauri 플러그인
      const { open } = await import(/* @vite-ignore */ '@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (typeof path === 'string') onChange(path);
      }
    } catch {
      await handleBackendPick();
    }
  }, [onChange]);

  /** 브라우저: 백엔드 API로 네이티브 폴더 다이얼로그 호출 */
  const handleBackendPick = useCallback(async () => {
    setIsPicking(true);
    try {
      const res = await systemApi.pickFolder();
      const path = res.data?.path;
      if (path) onChange(path);
    } catch (err) {
      // 비동기 후 fileInput.click()은 브라우저 보안으로 차단됨 → 안내 메시지
      alert(
        '폴더 선택에 실패했습니다.\n\n' +
          '1. 백엔드가 실행 중인지 확인하세요 (cd backend && python -m app.main)\n' +
          '2. 또는 경로를 직접 입력해 주세요'
      );
    } finally {
      setIsPicking(false);
    }
  }, [onChange]);

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const first = files[0];
      const pathProp = (first as File & { path?: string }).path;
      if (pathProp) {
        const rel = first.webkitRelativePath || '';
        const rootName = rel.split('/')[0] || '';
        const sep = pathProp.includes('\\') ? '\\' : '/';
        const baseLen = pathProp.length - rel.length;
        const folderPath = rootName
          ? pathProp.substring(0, baseLen) + rootName
          : pathProp.substring(0, pathProp.lastIndexOf(sep));
        onChange(folderPath);
      } else {
        // webkitdirectory에서 경로를 얻지 못함 → 백엔드 API 시도
        handleBackendPick();
      }
      e.target.value = '';
    },
    [onChange, handleBackendPick]
  );

  const handlePickClick = useCallback(async () => {
    if (disabled || isPicking) return;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      await handleTauriPick();
    } else {
      await handleBackendPick();
    }
  }, [disabled, isPicking, handleTauriPick, handleBackendPick]);

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 text-white bg-gray-700 placeholder-gray-400 ${inputClassName}`}
      />
      <input
        ref={fileInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />
      <button
        type="button"
        onClick={handlePickClick}
        disabled={disabled || isPicking}
        title="폴더 선택"
        className="flex items-center gap-2 px-4 py-2 border border-gray-500 rounded-lg text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 shrink-0"
      >
        {isPicking ? (
          <span className="animate-pulse text-sm text-white">선택 중...</span>
        ) : (
          <>
            <FolderOpen size={18} />
            <span className="hidden sm:inline">폴더 선택</span>
          </>
        )}
      </button>
    </div>
  );
}
