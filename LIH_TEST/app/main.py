from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LIH API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/api/v1/settings")
def get_settings():
    return {
        "llm_provider": "ollama",
        "ollama_chat_model": "llama3.2",
        "ollama_embedding_model": "nomic-embed-text",
    }
