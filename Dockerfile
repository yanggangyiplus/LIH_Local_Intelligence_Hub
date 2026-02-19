# LIH 백엔드 전용. Railway 등이 레포 루트에서 빌드할 때 사용.
# docker-compose 는 backend/Dockerfile 을 사용하므로 영향 없음.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# 경량 이미지 (4GB 제한): sentence-transformers/Ollama 제외, OpenAI 임베딩 사용
COPY backend/requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

COPY backend/ .

RUN mkdir -p data

EXPOSE 8000

# Railway 등 클라우드: 0.0.0.0 바인딩 필수, PORT는 Railway가 주입
ENV HOST=0.0.0.0
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
