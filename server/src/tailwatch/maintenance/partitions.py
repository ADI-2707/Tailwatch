import asyncio
from datetime import datetime, timezone, timedelta
import psycopg
from tailwatch.core.config import settings

async def create_future_partitions(conn: psycopg.AsyncConnection, days_ahead: int = 3):
    now = datetime.now(timezone.utc)
    for i in range(days_ahead + 1):
        target_date = now + timedelta(days=i)
        date_str = target_date.strftime("%Y%m%d")
        table_name = f"logs_p{date_str}"
        start_ts = target_date.strftime("%Y-%m-%d 00:00:00+00")

        query = f"""
        CREATE TABLE IF NOT EXISTS {table_name} PARTITION OF logs
        FOR VALUES FROM ('{start_ts}') TO ('{start_ts}'::timestamptz + interval '1 day');
        """
        await conn.execute(query)

async def drop_expired_partitions(conn: psycopg.AsyncConnection, retention_days: int = 14):
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    cutoff_date_str = cutoff.strftime("%Y%m%d")

    async with conn.cursor() as cur:
        await cur.execute("""
            SELECT relname FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r' AND n.nspname = 'public' AND c.relname LIKE 'logs_p%';
        """)
        rows = await cur.fetchall()

        for r in rows:
            p_name = r[0]
            date_part = p_name.replace("logs_p", "")
            if date_part.isdigit() and date_part < cutoff_date_str:
                drop_query = f"DROP TABLE IF EXISTS {p_name};"
                await conn.execute(drop_query)

async def run_maintenance():
    while True:
        try:
            async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
                await create_future_partitions(conn, 3)
                await drop_expired_partitions(conn, settings.tw_retention_default_days)
            await asyncio.sleep(3600)
        except Exception:
            await asyncio.sleep(60)

def start():
    asyncio.run(run_maintenance())
