from datetime import datetime, timezone, timedelta
from typing import Optional, List
import psycopg
from fastapi import APIRouter
from tailwatch.core.config import settings

router = APIRouter(prefix="/v1/logs", tags=["histogram"])

@router.get("/histogram")
async def get_histogram(
    service: Optional[str] = None,
    level: Optional[int] = None,
    hours: int = 24,
    step_minutes: int = 15
):
    now = datetime.now(timezone.utc)
    from_time = now - timedelta(hours=hours)

    query = f"""
    SELECT
        date_bin('{step_minutes} minutes'::interval, ts, '{from_time.isoformat()}'::timestamptz) AS bucket,
        level,
        count(*) AS count
    FROM logs
    WHERE ts >= %s AND ts <= %s
    """
    params: List[object] = [from_time, now]

    if service:
        query += " AND service = %s"
        params.append(service)

    if level:
        query += " AND level >= %s"
        params.append(level)

    query += " GROUP BY bucket, level ORDER BY bucket ASC, level ASC;"

    buckets_map = {}
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(query, params)
                rows = await cur.fetchall()
                for r in rows:
                    bucket_iso = r[0].isoformat()
                    lvl = r[1]
                    count = r[2]
                    if bucket_iso not in buckets_map:
                        buckets_map[bucket_iso] = {"bucket": bucket_iso, "total": 0, "levels": {}}
                    buckets_map[bucket_iso]["levels"][str(lvl)] = count
                    buckets_map[bucket_iso]["total"] += count
            except Exception:
                pass

    return {
        "buckets": list(buckets_map.values()),
        "step_minutes": step_minutes
    }
