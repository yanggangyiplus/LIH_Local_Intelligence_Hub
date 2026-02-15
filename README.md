# Local Intelligence Hub (LIH) 

LIH(Local Intelligence Hub)는 사용자의 로컬 파일 시스템을 직접 인덱싱하여 문서, 프로젝트, 개인 자료를 AI가 이해하고 관리할 수 있도록 설계된 **로컬 우선(Local-first) AI 시스템**입니다.

클라우드 업로드나 외부 데이터 전송 없이, 로컬 파일만을 기반으로 RAG(Retrieval-Augmented Generation) 구조를 적용해 **의미 기반 검색**과 **질의응답**을 제공합니다. 또한 파일과 폴더의 구조·내용·메타데이터를 분석하여 정리 계획(이동, 리네이밍, 중복 정리 등)을 생성하고, 사용자 확인 후 실제 파일 정리까지 실행할 수 있습니다.

모든 데이터 처리(파일, 임베딩, 벡터 DB, AI 추론)를 로컬에서 수행하여 보안과 프라이버시를 보장합니다.

## 핵심 엔진

1. **File Intelligence Engine** - 폴더 스캔, 중복/패턴 분석, AI 정리 계획 생성, 미리보기, 승인 후 실행, 작업 로그 기록(Undo 지원 설계)
2. **Local Knowledge Engine (RAG)** - ChromaDB + Ollama 기반 시맨틱 검색 및 질의응답
3. **Study & Context Engine** - 개념 추출, 요약, 질문/학습 계획 생성

## 특징

- **로컬 파일 인덱싱 및 RAG** - 프로젝트·주제 단위 의미 검색, 파일 내용과 맥락 기반 질의응답
- **파일 정리 자동화** - AI가 정리 계획(Plan)을 생성하고 미리보기 후, 사용자 승인 시에만 실제 파일 시스템에 반영
- **완전 로컬 실행** - 임베딩, 벡터 DB, LLM 추론까지 모두 로컬에서 처리, 외부 데이터 전송 없음
- **안전한 실행 흐름** - 이해 → 계획 → 미리보기 → 확인 → 실행, 작업 로그 저장으로 복원(Undo) 지원 구조

## 기술 스택

- **Backend:** Python 3.11+, FastAPI, ChromaDB, Ollama
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Desktop:** Tauri 2 (선택)

## 빠른 시작

### 1. Ollama 설치 및 모델 준비

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

### 2. Backend 실행

```bash
cd backend
pip install -e .
cp .env.example .env   # 선택
python -m app.main
```

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

### 4. (선택) Tauri 데스크톱

```bash
cargo install tauri-cli
cd src-tauri && cargo tauri dev
```

## 프로젝트 구조

```
├── backend/
│   └── app/
│       ├── core/           # 핵심 엔진
│       │   ├── file_intelligence/
│       │   ├── indexing/
│       │   ├── retrieval/
│       │   └── study/
│       ├── api/            # FastAPI 라우트
│       ├── models/         # 스키마
│       ├── services/       # DB 등
│       └── utils/          # Safe file ops
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── services/
├── docs/
│   ├── ARCHITECTURE.md     # 시스템 아키텍처
│   └── WORKFLOW.md        # 예시 워크플로우
└── src-tauri/             # Tauri 데스크톱
```

## API 문서

Backend 실행 후 http://localhost:8000/docs 에서 Swagger UI 확인.

## 문서

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - 아키텍처, API 설계, 보안/성능 고려사항
- [WORKFLOW.md](docs/WORKFLOW.md) - 예시 워크플로우 및 cURL 예시

## 라이선스

MIT
