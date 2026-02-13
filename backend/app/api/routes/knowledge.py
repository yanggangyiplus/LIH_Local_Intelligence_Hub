"""
Local Knowledge (RAG) API 라우트.
"""

import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.indexing.indexer import KnowledgeIndexer
from app.core.retrieval.generator import RAGGenerator
from app.core.retrieval.retriever import Retriever
from app.models.schemas import IndexRequest, QueryRequest, QueryResponse

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

# 인덱싱 작업 상태 (프로덕션에서는 DB 사용)
_index_jobs: dict[str, dict] = {}


@router.post("/index")
async def start_indexing(req: IndexRequest) -> dict:
    """인덱싱 작업 시작. 백그라운드로 실행되며 job_id로 상태 조회."""
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
        try:
            async for state in indexer.index_folder(
                req.root_path,
                job_id,
                exclude_patterns=req.exclude_patterns,
                force_reindex=req.force_reindex,
            ):
                _index_jobs[job_id].update(state)
            _index_jobs[job_id]["status"] = "completed"
        except Exception as e:
            _index_jobs[job_id]["status"] = "failed"
            _index_jobs[job_id]["error"] = str(e)

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
    """RAG 질의 (비스트리밍)."""
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


@router.post("/search")
async def semantic_search(req: QueryRequest) -> dict:
    """시맨틱 검색만 (LLM 답변 없이)."""
    retriever = Retriever()
    chunks = retriever.search(
        query=req.query,
        top_k=req.top_k,
        scope=req.scope,
        scope_path=req.scope_path,
    )
    return {"chunks": [c.model_dump() for c in chunks]}
