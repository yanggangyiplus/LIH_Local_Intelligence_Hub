"""
Local Knowledge Engine (RAG) API 라우트.

로컬 파일 인덱싱 → 의미 기반 검색·질의응답. 파일 내용·맥락 반영.
Ollama + ChromaDB. 완전 로컬, 외부 전송 없음.
"""

import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.indexing.indexer import COLLECTION_NAME, KnowledgeIndexer
from app.core.retrieval.generator import RAGGenerator
from app.core.retrieval.retriever import Retriever
from app.models.schemas import IndexRequest, QueryRequest, QueryResponse

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

# 인덱싱 작업 상태 (프로덕션에서는 DB 사용)
_index_jobs: dict[str, dict] = {}


@router.post("/index")
async def start_indexing(req: IndexRequest) -> dict:
    """로컬 폴더 인덱싱 시작. 문서·프로젝트·개인 자료를 RAG 검색 가능하게 함."""
    from app.utils.safe_file_ops import create_safe_ops_for_root
    from pathlib import Path

    try:
        root = Path(req.root_path).resolve()
        create_safe_ops_for_root(root)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    job_id = str(uuid.uuid4())
    _index_jobs[job_id] = {"status": "running", "progress": 0.0, "error": None}

    async def run():
        indexer = KnowledgeIndexer()
        from app.services.database import get_connection
        try:
            async with get_connection() as db:
                await db.execute(
                    "INSERT OR REPLACE INTO index_jobs (id, root_path, status) VALUES (?, ?, ?)",
                    (job_id, req.root_path, "running"),
                )
                await db.commit()
        except Exception:
            pass

        indexed_file_paths: list[str] = []
        try:
            async for state in indexer.index_folder(
                req.root_path,
                job_id,
                exclude_patterns=req.exclude_patterns,
                force_reindex=req.force_reindex,
            ):
                _index_jobs[job_id].update(state)
                # 인덱싱 성공한 파일 경로 수집 (대시보드용)
                if state.get("status") == "indexed" and state.get("current"):
                    indexed_file_paths.append(state["current"])
            _index_jobs[job_id]["status"] = "completed"

            try:
                async with get_connection() as db:
                    await db.execute(
                        "UPDATE index_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        ("completed", job_id),
                    )
                    # indexed_files 테이블에 파일 기록
                    for fpath in indexed_file_paths:
                        await db.execute(
                            """INSERT OR REPLACE INTO indexed_files
                               (id, file_path, index_job_id, indexed_at)
                               VALUES (?, ?, ?, CURRENT_TIMESTAMP)""",
                            (f"{job_id}_{hash(fpath) & 0xFFFFFFFF:08x}", fpath, job_id),
                        )
                    await db.commit()
            except Exception:
                pass
        except Exception as e:
            _index_jobs[job_id]["status"] = "failed"
            _index_jobs[job_id]["error"] = str(e)
            try:
                async with get_connection() as db:
                    await db.execute(
                        "UPDATE index_jobs SET status = ?, error_message = ? WHERE id = ?",
                        ("failed", str(e), job_id),
                    )
                    await db.commit()
            except Exception:
                pass

    import asyncio

    asyncio.create_task(run())
    return {"job_id": job_id, "status": "running"}


@router.get("/index/{job_id}")
async def get_index_status(job_id: str) -> dict:
    """인덱싱 작업 상태 조회."""
    if job_id not in _index_jobs:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return _index_jobs[job_id]


@router.post("/query")
async def query(req: QueryRequest) -> QueryResponse:
    """로컬 RAG 질의응답. 파일 내용·맥락 기반 의미 검색 후 답변 생성."""
    gen = RAGGenerator()
    answer, sources, model = await gen.generate(
        query=req.query,
        top_k=req.top_k,
        scope=req.scope,
        scope_path=req.scope_path,
    )
    return QueryResponse(
        answer=answer,
        sources=sources if req.include_sources else [],
        model_used=model,
    )


async def _stream_query(req: QueryRequest) -> AsyncGenerator[dict, None]:
    """RAG 스트리밍 질의."""
    gen = RAGGenerator()
    async for event in gen.generate_stream(
        query=req.query,
        top_k=req.top_k,
        scope=req.scope,
        scope_path=req.scope_path,
    ):
        yield event


@router.post("/query/stream")
async def query_stream(req: QueryRequest):
    """RAG 질의 (SSE 스트리밍)."""
    async def event_generator():
        gen = RAGGenerator()
        async for event in gen.generate_stream(
            query=req.query,
            top_k=req.top_k,
            scope=req.scope,
            scope_path=req.scope_path,
        ):
            import json
            yield {"event": "message", "data": json.dumps(event, ensure_ascii=False)}

    return EventSourceResponse(event_generator())


@router.get("/stats")
async def get_knowledge_stats() -> dict:
    """인덱싱된 문서 수 조회. RAG 사용 전 데이터 존재 여부 확인용."""
    indexer = KnowledgeIndexer()
    try:
        coll = indexer.get_collection(COLLECTION_NAME)
        count = coll.count()
        return {"collection_count": count, "ready": count > 0}
    except Exception as e:
        return {"collection_count": 0, "ready": False, "error": str(e)}


@router.delete("/reset")
async def reset_knowledge_base() -> dict:
    """ChromaDB 컬렉션 삭제 후 재생성. 임베딩 차원 불일치 등 해결용."""
    indexer = KnowledgeIndexer()
    try:
        indexer.client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    indexer.get_collection(COLLECTION_NAME)
    return {"status": "ok", "message": "지식 베이스가 초기화되었습니다. 다시 인덱싱해주세요."}


@router.post("/search")
async def semantic_search(req: QueryRequest) -> dict:
    """의미(시맨틱) 검색. 프로젝트·주제 단위 검색 (LLM 답변 없이 청크만 반환)."""
    retriever = Retriever()
    chunks = retriever.search(
        query=req.query,
        top_k=req.top_k,
        scope=req.scope,
        scope_path=req.scope_path,
    )
    return {"chunks": [c.model_dump() for c in chunks]}
