import asyncio
import uuid
import traceback
from datetime import datetime, timezone
import orjson
import psycopg
import redis.asyncio as redis
from tailwatch.core.config import settings

LEVEL_NUM_MAP = {
    "trace": 10,
    "debug": 20,
    "info": 30,
    "warn": 40,
    "warning": 40,
    "error": 50,
    "fatal": 60,
}

DEFAULT_PROJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def ensure_daily_partition(conn: psycopg.AsyncConnection, dt: datetime):
    date_str = dt.strftime("%Y%m%d")
    table_name = f"logs_p{date_str}"
    start_ts = dt.strftime("%Y-%m-%d 00:00:00+00")
    
    query = f"""
    CREATE TABLE IF NOT EXISTS {table_name} PARTITION OF logs
    FOR VALUES FROM ('{start_ts}') TO ('{start_ts}'::timestamptz + interval '1 day');
    """
    await conn.execute(query)

async def run_writer():
    r = redis.from_url(settings.tw_valkey_url, decode_responses=False)
    stream_name = "tw:ingest:stream"
    group_name = "tw:writers"
    consumer_name = f"writer-{uuid.uuid4().hex[:6]}"

    try:
        await r.xgroup_create(name=stream_name, groupname=group_name, id="0", mkstream=True)
    except Exception:
        pass

    async with await psycopg.AsyncConnection.connect(settings.tw_database_url, autocommit=True) as conn:
        await ensure_daily_partition(conn, datetime.now(timezone.utc))

        while True:
            try:
                entries = await r.xreadgroup(
                    groupname=group_name,
                    consumername=consumer_name,
                    streams={stream_name: "0"},
                    count=100
                )
                if not entries or not entries[0][1]:
                    entries = await r.xreadgroup(
                        groupname=group_name,
                        consumername=consumer_name,
                        streams={stream_name: ">"},
                        count=100,
                        block=1000
                    )
                if not entries or not entries[0][1]:
                    continue

                for stream, msg_list in entries:
                    for msg_id, data in msg_list:
                        payload = orjson.loads(data[b"payload"])
                        raw_batch_id = payload.get("batch_id")
                        try:
                            batch_id = uuid.UUID(str(raw_batch_id))
                        except Exception:
                            batch_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_batch_id))
                        events = payload.get("events", [])

                        async with conn.transaction():
                            res = await conn.execute(
                                """
                                INSERT INTO ingest_batches (project_id, batch_id, event_count)
                                VALUES (%s, %s, %s)
                                ON CONFLICT (project_id, batch_id) DO NOTHING
                                RETURNING batch_id;
                                """,
                                (DEFAULT_PROJECT_ID, batch_id, len(events))
                            )
                            is_new = await res.fetchone()
                            if is_new and events:
                                async with conn.cursor() as cur:
                                    async with cur.copy(
                                        "COPY logs (project_id, ts, level, service, host, source, message, fields, trace_id) FROM STDIN"
                                    ) as copy:
                                        for e in events:
                                            ts = e["ts"]
                                            lvl = LEVEL_NUM_MAP.get(str(e.get("level", "info")).lower(), 30)
                                            service = e.get("service", "unknown")
                                            agent_info = payload.get("agent") or {}
                                            host = e.get("host") or agent_info.get("host", "unknown")
                                            source = e.get("source", "")
                                            msg = e.get("message", "")
                                            fields_json = orjson.dumps(e.get("fields", {})).decode()
                                            trace_id = e.get("trace_id") or ""

                                            await copy.write_row((
                                                str(DEFAULT_PROJECT_ID),
                                                ts,
                                                lvl,
                                                service,
                                                host,
                                                source,
                                                msg,
                                                fields_json,
                                                trace_id
                                            ))

                        await r.xack(stream_name, group_name, msg_id)
            except Exception as ex:
                traceback.print_exc()
                await asyncio.sleep(1)

def start():
    asyncio.run(run_writer())
