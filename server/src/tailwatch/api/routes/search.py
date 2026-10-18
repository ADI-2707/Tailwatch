from datetime import datetime, timezone, timedelta
from typing import Optional
import psycopg
from fastapi import APIRouter, Query
from tailwatch.core.config import settings

router = APIRouter(prefix="/v1", tags=["logs"])

@router.get("/logs")
async def search_logs(
    q: Optional[str] = None,
    service: Optional[str] = None,
    level: Optional[int] = None,
    limit: int = Query(default=100, le=1000)
):
    now = datetime.now(timezone.utc)
    from_time = now - timedelta(hours=24)

    query_parts = ["SELECT id, ts, level, service, host, source, message, fields, trace_id FROM logs WHERE ts >= %s AND ts <= %s"]
    params = [from_time, now]

    if service:
        query_parts.append("AND service = %s")
        params.append(service)

    if level:
        query_parts.append("AND level >= %s")
        params.append(level)

    if q:
        query_parts.append("AND message ILIKE %s")
        params.append(f"%{q}%")

    query_parts.append("ORDER BY ts DESC, id DESC LIMIT %s")
    params.append(limit)

    full_sql = " ".join(query_parts)

    results = []
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(full_sql, params)
                rows = await cur.fetchall()
                for r in rows:
                    results.append({
                        "id": str(r[0]),
                        "ts": r[1].isoformat(),
                        "level": r[2],
                        "service": r[3],
                        "host": r[4],
                        "source": r[5],
                        "message": r[6],
                        "fields": r[7],
                        "trace_id": r[8]
                    })
            except Exception:
                pass

    return {
        "events": results,
        "count": len(results)
    }
