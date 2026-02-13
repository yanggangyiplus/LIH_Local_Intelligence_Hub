# Local Intelligence Hub - 시스템 아키텍처

## 1. 개요

Local Intelligence Hub(LIH)는 로컬 기기에서 완전히 실행되는 파일 중심 AI 워크스페이스입니다.
클라우드 업로드 없이 로컬 데이터만으로 파일 분석, RAG 기반 질의응답, 학습 워크플로우를 제공합니다.

---

## 2. 고수준 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Local Intelligence Hub                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Tauri Desktop  │  │  React Frontend │  │  File Watcher   │              │
│  │     Shell       │  │     (SPA)       │  │   (Background)  │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           └────────────────────┼────────────────────┘                        │
│                                │                                             │
│                    ┌───────────▼───────────┐                                  │
│                    │   FastAPI Backend     │                                  │
│                    │   (Async + Streaming) │                                  │
│                    └───────────┬───────────┘                                  │
│                                │                                             │
│  ┌─────────────────────────────┼─────────────────────────────┐               │
│  │              Core Engines   │                             │               │
│  │  ┌──────────────┐ ┌────────▼────────┐ ┌─────────────────┐ │               │
│  │  │ File         │ │ Local Knowledge │ │ Study & Context │ │               │
│  │  │ Intelligence │ │ Engine (RAG)    │ │ Engine          │ │               │
│  │  │ Engine       │ │                 │ │                 │ │               │
│  │  └──────┬───────┘ └────────┬────────┘ └────────┬────────┘ │               │
│  │         │                  │                   │          │               │
│  └─────────┼──────────────────┼───────────────────┼──────────┘               │
│            │                  │                   │                          │
│  ┌─────────▼──────────────────▼───────────────────▼──────────┐               │
│  │              Shared Infrastructure                         │               │
│  │  • Safe File Operations  • Config  • Logging  • Embedding  │               │
│  └────────────────────────────┬──────────────────────────────┘               │
│                               │                                              │
│  ┌────────────────────────────▼──────────────────────────────┐               │
│  │              Local Storage Layer                           │               │
│  │  ChromaDB (Vectors) │ SQLite (Metadata) │ File System      │               │
│  └───────────────────────────────────────────────────────────┘               │
│                               │                                              │
│  ┌────────────────────────────▼──────────────────────────────┐               │
│  │              LLM Layer (Ollama)                            │               │
│  │  • Embedding Models  • Chat/Completion Models              │               │
│  └───────────────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 핵심 엔진 상세 설계

### 3.1 File Intelligence Engine

| 단계 | 설명 | 책임 분리 |
|------|------|-----------|
| Scan | 사용자 선택 디렉토리 스캔 | `FileScanner` |
| Analyze | 메타데이터, 중복, 패턴 분석 | `FileAnalyzer` |
| Plan | AI 기반 정리 계획 생성 | `OrganizationPlanner` |
| Preview | 변경 사항 미리보기 | `ChangePreview` |
| Confirm | 사용자 확인 | API + Frontend |
| Apply | 실제 적용 (인간 확인 필수) | `FileOperations` (Safe Layer) |

**원칙:** 분석 → 계획 → 실행의 명확한 분리. Apply는 항상 human-in-the-loop.

### 3.2 Local Knowledge Engine (RAG)

| 구성요소 | 역할 |
|----------|------|
| Indexer | 폴더 기반 인덱싱, 텍스트 추출(PDF, docx, txt, md, 코드), 청킹 |
| Embedder | 로컬 임베딩 모델(Ollama) 또는 sentence-transformers |
| ChromaDB | 벡터 저장 및 유사도 검색 |
| Retriever | 시맨틱 검색, 하이브리드 검색 |
| Generator | LLM(Ollama) 기반 답변 생성, 출처 인용 |

**쿼리 모드:** 전체 시스템 / 특정 폴더 / 특정 프로젝트 / 특정 파일

### 3.3 Study & Context Engine

| 기능 | 설명 |
|------|------|
| Concept Extraction | 선택 폴더에서 개념 추출 |
| Summary | 문서 요약 생성 |
| Question Gen | 학습용 질문 생성 |
| Interview Gen | 면접 질문 생성 |
| Study Plan | 학습 계획 생성 |
| Concept Linking | 파일 간 개념 연결 |

---

## 4. 데이터베이스 스키마

### 4.1 SQLite (메타데이터, 운영 데이터)

```sql
-- 인덱싱 작업 및 상태
CREATE TABLE index_jobs (
    id TEXT PRIMARY KEY,
    root_path TEXT NOT NULL,
    status TEXT NOT NULL,  -- pending, running, completed, failed
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    config_json TEXT
);

-- 인덱싱된 파일 메타데이터 (벡터 DB와 동기화용)
CREATE TABLE indexed_files (
    id TEXT PRIMARY KEY,
    file_path TEXT UNIQUE NOT NULL,
    index_job_id TEXT REFERENCES index_jobs(id),
    last_modified TIMESTAMP,
    file_hash TEXT,
    chunk_count INTEGER,
    indexed_at TIMESTAMP
);

-- 파일 정리 작업 로그 (Undo 지원)
CREATE TABLE reorganization_logs (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,  -- rename, move, archive, delete
    source_path TEXT NOT NULL,
    target_path TEXT,
    original_state_json TEXT,  -- 복원에 필요한 원본 상태
    executed_at TIMESTAMP,
    dry_run BOOLEAN DEFAULT FALSE
);

-- 스캔 캐시 (빠른 분석용)
CREATE TABLE scan_cache (
    root_path TEXT PRIMARY KEY,
    scan_result_json TEXT,
    scanned_at TIMESTAMP
);
```

### 4.2 ChromaDB

- **Collection:** `local_knowledge`
- **Metadata:** `file_path`, `chunk_index`, `source_type`, `index_job_id`, `folder_path`
- **Document:** 청크된 텍스트
- **Embedding:** 로컬 모델 생성 벡터

---

## 5. API 엔드포인트 설계

### File Intelligence

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/file-intelligence/scan` | 폴더 스캔 시작 |
| GET | `/api/v1/file-intelligence/scan/{job_id}` | 스캔 상태 조회 |
| POST | `/api/v1/file-intelligence/analyze` | 스캔 결과 분석 |
| POST | `/api/v1/file-intelligence/plan` | AI 정리 계획 생성 |
| POST | `/api/v1/file-intelligence/preview` | 변경 미리보기 |
| POST | `/api/v1/file-intelligence/apply` | 적용 (확인 필요) |
| GET | `/api/v1/file-intelligence/history` | 작업 이력 조회 |

### Local Knowledge (RAG)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/knowledge/index` | 인덱싱 작업 시작 |
| GET | `/api/v1/knowledge/index/{job_id}` | 인덱싱 상태 조회 |
| POST | `/api/v1/knowledge/query` | 질의 (스트리밍) |
| POST | `/api/v1/knowledge/search` | 시맨틱 검색 (비스트리밍) |
| DELETE | `/api/v1/knowledge/index` | 인덱스 삭제 (옵션) |

### Study & Context

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/study/concepts` | 개념 추출 |
| POST | `/api/v1/study/summary` | 요약 생성 |
| POST | `/api/v1/study/questions` | 질문 생성 |
| POST | `/api/v1/study/plan` | 학습 계획 생성 |
| POST | `/api/v1/study/links` | 개념 연결 |

### 시스템

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/health` | 헬스체크 |
| GET | `/api/v1/config` | 설정 조회 |
| GET | `/api/v1/llm/models` | 사용 가능 LLM 목록 (Ollama) |

---

## 6. 보안 고려사항

| 항목 | 대응 |
|------|------|
| 경로 조작 | 모든 경로를 정규화 후 사용자 허용 루트 내인지 검증 |
| 파일 시스템 | Safe File Operations 추상화층에서 위험 작업 차단 |
| 민감 데이터 | 로컬 실행, 업로드 없음. .env 등 민감 설정 제외 |
| LLM 프롬프트 | 사용자 입력 검증, 인젝션 방지 |
| 디렉토리 순회 | 심볼릭 링크, 권한 검사, 경로 깊이 제한 |

---

## 7. 성능 고려사항

| 항목 | 전략 |
|------|------|
| 대용량 스캔 | 청크 단위 비동기 처리, 진행률 스트리밍 |
| 인덱싱 | 백그라운드 태스크, 우선순위 큐 |
| RAG 검색 | 청크 크기/오버랩 튜닝, 하이브리드 검색 |
| 스트리밍 | SSE(Server-Sent Events)로 LLM 응답 스트리밍 |
| 캐싱 | 스캔 결과 캐시, 임베딩 캐시 |
| 파일 감시 | watchdog 등으로 증분 인덱싱 트리거 |

---

## 8. 확장성 및 미래 고려사항

- **멀티 모델:** Ollama 외 LLaMA.cpp, vLLM 등 플러그인 가능 구조
- **플러그인:** 새 파일 타입 파서, 새 엔진을 플러그인으로 추가
- **분산 인덱싱:** 여러 머신의 로컬 인덱스 병합 (미래)
- **Tauri:** 데스크톱 앱 패키징, 시스템 트레이, 네이티브 파일 권한 활용
