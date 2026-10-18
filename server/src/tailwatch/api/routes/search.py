from datetime import datetime, timezone, timedelta
from typing import Optional, List
import psycopg
from fastapi import APIRouter, Query, HTTPException
from tailwatch.core.config import settings
from tailwatch.query.compiler import QueryCompiler

router = APIRouter(prefix="/v1", tags=["logs"])

@router.get("/logs")
async def search_logs(
    q: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    cursor_ts: Optional[str] = None,
    cursor_id: Optional[int] = None
):
    now = datetime.now(timezone.utc)
    from_time = now - timedelta(hours=24)

    where_clauses = ["ts >= %s", "ts <= %s"]
    params: List[object] = [from_time, now]

    if q and q.strip():
        compiler = QueryCompiler(q.strip())
        sql_clause, comp_params = compiler.compile()
        sql_clause_py = sql_clause
        for idx in range(len(comp_params), 0, -1):
            sql_clause_py = sql_clause_py.replace(f"${idx}", "%s")
        where_clauses.append(f"({sql_clause_py})")
        params.extend(comp_params)

    if cursor_ts and cursor_id:
        where_clauses.append("(ts, id) < (%s, %s)")
        params.extend([cursor_ts, cursor_id])

    where_str = " AND ".join(where_clauses)
    query = f"""
    SELECT id, ts, level, service, host, source, message, fields, trace_id
    FROM logs
    WHERE {where_str}
    ORDER BY ts DESC, id DESC
    LIMIT %s
    """
    params.append(limit)

    results = []
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(query, params)
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

    next_cursor = None
    if results and len(results) == limit:
        last = results[-1]
        next_cursor = {"ts": last["ts"], "id": int(last["id"])}

    return {
        "events": results,
        "count": len(results),
        "next_cursor": next_cursor
    }

@router.get("/logs/context")
async def get_log_context(
    log_id: int,
    ts: str,
    service: str,
    lines: int = Query(default=10, le=50)
):
    query = """
    (
        SELECT id, ts, level, service, host, source, message, fields, trace_id
        FROM logs
        WHERE service = %s AND (ts, id) <= (%s, %s)
        ORDER BY ts DESC, id DESC
        LIMIT %s
    )
    UNION ALL
    (
        SELECT id, ts, level, service, host, source, message, fields, trace_id
        FROM logs
        WHERE service = %s AND (ts, id) > (%s, %s)
        ORDER BY ts ASC, id ASC
        LIMIT %s
    )
    ORDER BY ts ASC, id ASC;
    """

    results = []
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(query, (service, ts, log_id, lines, service, ts, log_id, lines))
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
            except Exception as ex:
                raise HTTPException(status_code=500, detail=str(ex))

    return {"events": results, "count": len(results)}
