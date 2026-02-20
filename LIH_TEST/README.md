# Local Intelligence Hub (LIH)

**Privacy-First AI Workspace** — 로컬 파일 기반 AI 정리·검색·학습 플랫폼

> 클라우드 업로드 없이, 로컬 파일만으로 AI 기반 파일 정리, 지식 검색(RAG), 학습 지원을 제공합니다.

## 핵심 가치

| 가치 | 설명 |
|------|------|
| **프라이버시** | 파일, 임베딩, 벡터 DB 로컬 처리. 외부 전송 없음 |
| **하이브리드 AI** | OpenAI GPT + 로컬 Ollama. 사용자가 선택 |
| **안전한 실행** | 이해→계획→미리보기→확인→실행→되돌리기(Undo) |
| **즉시 시작** | 설치 후 3분이면 첫 AI 분석 가능 |

## 고객 문제점과 해결방안

| 대상 | 문제 | LIH 해결방안 |
|------|------|--------------|
| 로컬 파일이 복잡하게 쌓인 개발자·학생 | 정리 어려움, 검색 비효율 | AI 기반 의미 검색 + 자동 정리 계획 |
| 보안·프라이버시 제약 사용자 | 클라우드 AI 사용 불가 | 완전 로컬 처리 옵션 |
| 파일 정리를 자동화하고 싶은 사용자 | 수동 정리 부담 | AI 계획 생성 → 미리보기 → 승인 후 실행 |

## 3대 핵심 엔진

### 1. File Intelligence Engine
폴더 스캔 → AI 분석 → 정리 계획(이동/리네이밍/중복 정리) → 미리보기 → 승인 후 실행 → Undo

### 2. Local Knowledge Engine (RAG)
ChromaDB + OpenAI/Ollama 기반 시맨틱 검색. 스트리밍 채팅 UI로 실시간 질의응답.

### 3. Study & Context Engine
핵심 개념 추출, 자동 요약, 학습 질문 생성, 면접 질문, 학습 계획. 플래시카드 UI.

## 수익 모델 (SaaS)

| Free | Pro (월 9,900원) | Enterprise |
|------|------------------|------------|
| Ollama 로컬 AI | OpenAI GPT-4o-mini/4o | Pro 전체 + 팀 기능 |
| 월 5회 스캔 | 무제한 | SSO / 접근 제어 |
| 월 20회 질의 | 스트리밍 채팅 | 온프레미스 배포 |
| 기본 학습 | 고급 분석 + 면접 | SLA / 전담 지원 |

## AI 활용 (OpenAI API)

- **GPT-4o-mini**: RAG 질의응답, 파일 정리 계획, 학습 콘텐츠 생성
- **스트리밍 응답**: SSE 기반 실시간 토큰 스트리밍
- **하이브리드**: OpenAI ↔ Ollama 런타임 전환 (설정 페이지)
- **로컬 임베딩**: sentence-transformers / Ollama nomic-embed-text

## 기술 스택

- **Backend**: Python 3.11+, FastAPI, ChromaDB, OpenAI API, Ollama
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Desktop**: Tauri 2 (선택)
- **배포**: Docker / Docker Compose

## 빠른 시작

### 1. Backend

```bash
cd backend
pip install -e .
cp .env.example .env
# .env에 OPENAI_API_KEY 입력
python -m app.main
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

http://localhost:3000 접속

### 3. Docker (선택)

```bash
OPENAI_API_KEY=sk-... docker compose up --build
```

### 4. Tauri 데스크톱 (선택)

```bash
cargo install tauri-cli
cd src-tauri && cargo tauri dev
```

## 프로젝트 구조

```
├── backend/
│   └── app/
│       ├── core/
│       │   ├── llm/              # LLM Provider 추상화 (OpenAI/Ollama)
│       │   ├── file_intelligence/ # 파일 스캔·분석·정리
│       │   ├── indexing/          # RAG 인덱싱·임베딩
│       │   ├── retrieval/         # 시맨틱 검색·답변 생성
│       │   └── study/             # 학습 엔진
│       ├── api/routes/            # REST API
│       ├── models/                # Pydantic 스키마
│       └── services/              # DB 관리
├── frontend/
│   └── src/
│       ├── pages/                 # Dashboard, FileIntelligence, Knowledge, Study, Settings, Pricing, Landing
│       ├── components/            # Layout, FolderPathInput 등
│       └── services/              # API 클라이언트
├── docker-compose.yml
└── src-tauri/                     # Tauri 데스크톱
```

## API 문서

Backend 실행 후 http://localhost:8000/docs 에서 Swagger UI 확인.

## 라이선스

MIT
