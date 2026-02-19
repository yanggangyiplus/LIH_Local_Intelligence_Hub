/**
 * 파일 업로드 드래그앤드롭 + 파일 선택 컴포넌트.
 * 웹 환경에서 로컬 폴더 대신 파일을 업로드해 서버에 저장.
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadApi } from '../services/api';

interface FileUploadZoneProps {
  /** 업로드 완료 후 서버 경로 반환 */
  onUploadComplete: (uploadPath: string, sessionId: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function FileUploadZone({ onUploadComplete, disabled, className = '' }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ path: string; count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const unique = arr.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
    setUploadResult(null);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    try {
      const res = await uploadApi.upload(files);
      const { upload_path, session_id, saved_count, skipped_files } = res.data;
      setUploadResult({ path: upload_path, count: saved_count });
      onUploadComplete(upload_path, session_id);
      if (skipped_files?.length) {
        toast(`${skipped_files.length}개 파일 건너뜀 (형식/크기)`, { icon: '⚠️' });
      }
      toast.success(`${saved_count}개 파일 업로드 완료`);
    } catch {
      toast.error('업로드 실패');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className={className}>
      {/* 드래그앤드롭 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload size={32} className={`mx-auto mb-3 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
        <p className="text-sm text-gray-300 font-medium">
          파일을 드래그하거나 <span className="text-indigo-400">클릭</span>해서 선택
        </p>
        <p className="text-xs text-gray-500 mt-1">
          txt, md, py, js, pdf, docx 등 지원 · 파일당 최대 50MB
        </p>
      </div>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
          {files.map((f, i) => (
            <div key={f.name + i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs">
              <FileText size={14} className="text-indigo-400 shrink-0" />
              <span className="flex-1 text-gray-300 truncate">{f.name}</span>
              <span className="text-gray-500 shrink-0">{formatSize(f.size)}</span>
              {!isUploading && (
                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-gray-500 hover:text-red-400">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      {files.length > 0 && !uploadResult && (
        <button
          onClick={handleUpload}
          disabled={isUploading || disabled}
          className="btn-primary w-full mt-3 py-2.5 text-sm"
        >
          {isUploading ? (
            <><Loader2 size={16} className="animate-spin" /> 업로드 중...</>
          ) : (
            <><Upload size={16} /> {files.length}개 파일 업로드</>
          )}
        </button>
      )}

      {/* 업로드 완료 */}
      {uploadResult && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          <CheckCircle size={16} />
          {uploadResult.count}개 파일 업로드 완료 — 이제 인덱싱/학습을 시작하세요
        </div>
      )}
    </div>
  );
}
