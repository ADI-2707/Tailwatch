import time
from datetime import datetime, timezone
import orjson
import redis.asyncio as redis
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from tailwatch.api.deps import verify_api_key
from tailwatch.core.config import settings
from tailwatch.ingest.models import IngestBatchRequest

router = APIRouter(prefix="/v1", tags=["ingest"])

redis_client = redis.from_url(settings.tw_valkey_url, decode_responses=False)

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_logs(
    payload: IngestBatchRequest,
    response: Response,
    key_hash: str = Depends(verify_api_key),
    x_tw_batch_id: str = Header(None)
):
    batch_id = payload.batch_id or x_tw_batch_id
    if not batch_id:
        raise HTTPException(status_code=400, detail="Missing batch_id")

    event_count = len(payload.events)
    now_sec = int(time.time())
    rate_key = f"tw:rate:{key_hash}:{now_sec}"
    
    current_sec_count = await redis_client.incrby(rate_key, event_count)
    if current_sec_count == event_count:
        await redis_client.expire(rate_key, 2)

    if current_sec_count > 10000:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Burst maximum is 10,000 events/sec.",
            headers={"Retry-After": "1"}
        )

    if payload.agent and payload.agent.host:
        host_key = f"tw:host:{payload.agent.host}"
        r_text = redis.from_url(settings.tw_valkey_url, decode_responses=True)
        await r_text.hset(
            host_key,
            mapping={
                "host": payload.agent.host,
                "ip": getattr(payload.agent, "ip", None) or "remote",
                "version": getattr(payload.agent, "version", None) or "1.0.0",
                "spool_pct": str(getattr(payload.agent, "spool_percent", None) or 0),
                "rate": str(getattr(payload.agent, "events_per_sec", None) or event_count),
                "last_seen": datetime.now(timezone.utc).isoformat()
            }
        )
        await r_text.expire(host_key, 60)
        await r_text.aclose()

    stream_len = await redis_client.xlen("tw:ingest:stream")
    events = payload.events
    if stream_len > 75000:
        filtered = [e for e in events if e.level not in ("debug", "trace")]
        if len(filtered) < len(events):
            response.headers["x-tw-shed"] = "debug,trace"
            events = filtered

    packed_data = orjson.dumps({
        "batch_id": batch_id,
        "key_hash": key_hash,
        "agent": payload.agent.model_dump() if payload.agent else None,
        "events": [e.model_dump(mode="json") for e in events]
    })

    await redis_client.xadd(
        name="tw:ingest:stream",
        fields={"payload": packed_data},
        maxlen=100000,
        approximate=True
    )

    for e in events:
        await redis_client.publish(
            "tw:channel:tail",
            orjson.dumps(e.model_dump(mode="json")).decode()
        )

    return {
        "status": "accepted",
        "batch_id": batch_id,
        "count": len(events)
    }
