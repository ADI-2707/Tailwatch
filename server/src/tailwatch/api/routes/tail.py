import asyncio
import orjson
import redis.asyncio as redis
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from tailwatch.core.config import settings

router = APIRouter(prefix="/v1/logs", tags=["live-tail"])

@router.get("/tail")
async def live_tail():
    async def event_generator():
        r = redis.from_url(settings.tw_valkey_url, decode_responses=False)
        pubsub = r.pubsub()
        await pubsub.subscribe("tw:channel:tail")

        try:
            while True:
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg is not None:
                    data = msg["data"].decode("utf-8")
                    yield f"event: log\ndata: {data}\n\n"
                else:
                    yield ": ping\n\n"
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            await pubsub.unsubscribe("tw:channel:tail")
            await pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
