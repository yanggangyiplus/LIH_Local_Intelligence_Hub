# Local Intelligence Hub

로컬에서 완전히 실행되는 파일 중심 AI 워크스페이스.  
클라우드 업로드 없이 로컬 파일 분석, RAG 기반 질의응답, 학습 워크플로우를 제공합니다.

## 핵심 엔진

1. **File Intelligence Engine** - 폴더 스캔, 중복/패턴 분석, AI 정리 계획 생성
2. **Local Knowledge Engine (RAG)** - ChromaDB + Ollama 기반 시맨틱 검색 및 질의응답
3. **Study & Context Engine** - 개념 추출, 요약, 질문/학습 계획 생성

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
