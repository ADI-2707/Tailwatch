import orjson
import redis.asyncio as redis
from fastapi import APIRouter, Depends, Header, HTTPException, status
from tailwatch.api.deps import verify_api_key
from tailwatch.core.config import settings
from tailwatch.ingest.models import IngestBatchRequest

router = APIRouter(prefix="/v1", tags=["ingest"])

redis_client = redis.from_url(settings.tw_valkey_url, decode_responses=False)

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_logs(
    payload: IngestBatchRequest,
    key_hash: str = Depends(verify_api_key),
    x_tw_batch_id: str = Header(None)
):
    batch_id = payload.batch_id or x_tw_batch_id
    if not batch_id:
        raise HTTPException(status_code=400, detail="Missing batch_id")

    packed_data = orjson.dumps({
        "batch_id": batch_id,
        "key_hash": key_hash,
        "agent": payload.agent.model_dump() if payload.agent else None,
        "events": [e.model_dump(mode="json") for e in payload.events]
    })

    await redis_client.xadd(
        name="tw:ingest:stream",
        fields={"payload": packed_data},
        maxlen=100000,
        approximate=True
    )

    return {
        "status": "accepted",
        "batch_id": batch_id,
        "count": len(payload.events)
    }
