#!/usr/bin/env bash
# LIH 백엔드를 단일 실행 파일로 빌드해 src-tauri/binaries/에 넣음 (Tauri sidecar용).
# 사용: ./scripts/build_sidecar.sh
# 이후: cargo tauri build

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/backend"
BINARIES="$ROOT/src-tauri/binaries"

# Target triple 감지 (rustc가 있으면 사용, 없으면 uname으로 판단)
if command -v rustc &>/dev/null; then
  TARGET_TRIPLE="$(rustc --print host-tuple)"
else
  ARCH="$(uname -m)"
  if [ "$ARCH" = "arm64" ]; then
    TARGET_TRIPLE="aarch64-apple-darwin"
  else
    TARGET_TRIPLE="x86_64-apple-darwin"
  fi
fi

echo "[build_sidecar] Backend: $BACKEND"
echo "[build_sidecar] Target:  $TARGET_TRIPLE"

# 가상환경 생성 (글로벌 Python 오염 방지)
VENV="$BACKEND/.venv-sidecar"
if [ ! -d "$VENV" ]; then
  echo "[build_sidecar] 가상환경 생성: $VENV"
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"

cd "$BACKEND"
pip install -q -r requirements-railway.txt
pip install -q pyinstaller

# 단일 실행 파일 빌드 (경량 의존성만, 불필요한 패키지 제외)
pyinstaller --onefile \
  --name lih-backend \
  --hidden-import=uvicorn.logging \
  --hidden-import=uvicorn.loops.auto \
  --hidden-import=uvicorn.protocols.http.auto \
  --hidden-import=uvicorn.protocols.websockets.auto \
  --hidden-import=uvicorn.lifespan.on \
  --hidden-import=app.main \
  --hidden-import=app.core.config \
  --hidden-import=app.core.llm.provider \
  --hidden-import=app.core.indexing.embedder \
  --hidden-import=app.core.indexing.indexer \
  --hidden-import=app.core.indexing.chunker \
  --hidden-import=app.core.indexing.extractor \
  --hidden-import=app.core.retrieval.retriever \
  --hidden-import=app.core.retrieval.generator \
  --hidden-import=app.core.file_intelligence \
  --hidden-import=app.core.study \
  --hidden-import=app.api.routes.dashboard \
  --hidden-import=app.api.routes.file_intelligence \
  --hidden-import=app.api.routes.knowledge \
  --hidden-import=app.api.routes.settings_api \
  --hidden-import=app.api.routes.study \
  --hidden-import=app.api.routes.system \
  --hidden-import=app.api.routes.upload \
  --hidden-import=app.api.deps \
  --hidden-import=app.services.database \
  --hidden-import=app.models \
  --hidden-import=app.utils \
  --collect-all=chromadb \
  --exclude-module=torch \
  --exclude-module=torchvision \
  --exclude-module=torchaudio \
  --exclude-module=sentence_transformers \
  --exclude-module=scipy \
  --exclude-module=pandas \
  --exclude-module=numpy \
  --exclude-module=sklearn \
  --exclude-module=matplotlib \
  --exclude-module=PIL \
  --exclude-module=cv2 \
  --exclude-module=tensorflow \
  --exclude-module=onnxruntime \
  --exclude-module=nltk \
  --exclude-module=pytest \
  --exclude-module=ollama \
  run_sidecar.py

mkdir -p "$BINARIES"
OUT="$BACKEND/dist/lih-backend"
if [ -f "$OUT" ]; then
  cp "$OUT" "$BINARIES/lih-backend-$TARGET_TRIPLE"
  chmod +x "$BINARIES/lih-backend-$TARGET_TRIPLE"
  SIZE=$(du -h "$BINARIES/lih-backend-$TARGET_TRIPLE" | cut -f1)
  echo "[build_sidecar] OK: $BINARIES/lih-backend-$TARGET_TRIPLE ($SIZE)"
else
  echo "[build_sidecar] FAIL: $OUT not found"
  exit 1
fi

deactivate 2>/dev/null || true
