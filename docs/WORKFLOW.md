# Local Intelligence Hub - 예시 워크플로우

## 전체 실행 순서

### 1. 사전 요구사항

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) 설치 및 실행
- (선택) Tauri 빌드용 Rust

### 2. Ollama 모델 준비

```bash
# 임베딩 모델 (RAG용)
ollama pull nomic-embed-text

# 채팅 모델 (질의응답, 계획 생성용)
ollama pull llama3.2
```

### 3. Backend 실행

```bash
cd backend
pip install -e .   # 또는 uv sync
# .env 설정 (선택, 기본값 사용 가능)
python -m app.main  # 또는: uvicorn app.main:app --reload --port 8000
```

### 4. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

### 5. Tauri 데스크톱 앱 (선택)

```bash
# 프로젝트 루트에서
cargo install tauri-cli
cd src-tauri && cargo tauri dev
```

---

## 예시 워크플로우 1: 파일 정리

1. **파일 인텔리전스** 탭으로 이동
2. 정리할 폴더 경로 입력 (예: `/Users/me/Downloads`)
3. **스캔** 클릭 → 스캔 결과 확인 (파일 수, 중복, 패턴)
4. **AI 정리 계획 생성** 클릭
5. API `/preview` 로 변경 사항 미리보기
6. 확인 후 `/apply` (confirm=true) 로 적용

---

## 예시 워크플로우 2: RAG 질의응답

1. **로컬 지식** 탭으로 이동
2. 인덱싱할 폴더 경로 입력 (예: 프로젝트 루트)
3. **인덱싱 시작** → 백그라운드 인덱싱 완료 대기
4. 질문 입력 (예: "이 프로젝트의 아키텍처는?")
5. **검색** 클릭 → 출처와 함께 답변 확인

---

## 예시 워크플로우 3: 학습 공간

1. **학습 엔진** 탭으로 이동
2. 학습할 폴더 경로 입력
3. **요약 생성** → 폴더 내용 요약
4. API `/study/concepts` → 개념 추출
5. API `/study/questions` → 학습용 질문 생성
6. API `/study/plan` → 학습 계획 생성

---

## API 예시 (cURL)

```bash
# 스캔
curl -X POST http://localhost:8000/api/v1/file-intelligence/scan \
  -H "Content-Type: application/json" \
  -d '{"root_path": "/Users/me/Documents"}'

# RAG 질의
curl -X POST http://localhost:8000/api/v1/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{"query": "이 프로젝트의 핵심 기능은?", "scope": "all", "top_k": 8}'

# 학습 요약
curl -X POST http://localhost:8000/api/v1/study/summary \
  -H "Content-Type: application/json" \
  -d '{"root_path": "/path/to/project", "options": {}}'
```

---

## RAG 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| "검색된 관련 문서가 없습니다" | 인덱싱 미완료 또는 빈 폴더 | 폴더 선택 후 **인덱싱 시작** 실행, 완료될 때까지 대기 (UI에 진행률 표시) |
| 임베딩 차원 불일치 오류 | Ollama(768차원)와 sentence-transformers(384차원) 혼용 | `.env`에 `FORCE_SENTENCE_TRANSFORMERS=true` 추가 후 ChromaDB 초기화(`backend/data/chroma` 삭제)하고 재인덱싱 |
| Ollama 미실행 시 답변 품질 저하 | LLM 호출 실패 | `ollama serve` 실행, `ollama pull llama3.2`로 모델 준비 |
| 검색 결과가 부족함 | top_k가 작음 | API 요청 시 `top_k: 10` 이상으로 증가 |
