import sys
import uuid
import hashlib
import asyncio
import uvicorn
from tailwatch.core.config import settings

async def run_unified_worker():
    from tailwatch.alerting.evaluator import Alerter
    from tailwatch.alerting.notifier import run_notifier
    from tailwatch.maintenance.partitions import run_maintenance

    alerter = Alerter()
    await asyncio.gather(
        alerter.run(),
        run_notifier(),
        run_maintenance(),
    )

def run_seed():
    import psycopg

    default_project_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    key_secret = "twk_live_test_key_master"
    key_hash = hashlib.sha256(key_secret.encode()).hexdigest()

    with psycopg.connect(settings.tw_database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO projects (id, slug, name, retention_days)
                VALUES (%s, 'production', 'Production', 14)
                ON CONFLICT (id) DO NOTHING;
            """, (default_project_id,))

            cur.execute("""
                INSERT INTO api_keys (id, project_id, name, key_prefix, key_hash, scopes)
                VALUES (%s, %s, 'Default Master Key', 'twk_live', %s, ARRAY['ingest'])
                ON CONFLICT (key_hash) DO NOTHING;
            """, (uuid.uuid4(), default_project_id, key_hash))

            cur.execute("""
                INSERT INTO alert_rules (id, project_id, name, query, threshold, window_s, severity)
                VALUES (%s, %s, 'High Error Rate (>10)', 'level:error', 10, 300, 'critical')
                ON CONFLICT DO NOTHING;
            """, (uuid.uuid4(), default_project_id))

        conn.commit()
    print("Database seeded successfully with default project, API key, and alert rules.")

def main():
    if len(sys.argv) < 2:
        print("Usage: tailwatch [api|writer|worker|alerter|notifier|maintenance|migrate|seed]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "api":
        uvicorn.run("tailwatch.api.main:app", host="0.0.0.0", port=8000, reload=False)
    elif cmd == "writer":
        from tailwatch.writer.consumer import start
        start()
    elif cmd == "worker":
        asyncio.run(run_unified_worker())
    elif cmd == "alerter":
        from tailwatch.alerting.evaluator import start
        start()
    elif cmd == "notifier":
        from tailwatch.alerting.notifier import start
        start()
    elif cmd == "maintenance":
        from tailwatch.maintenance.partitions import start
        start()
    elif cmd == "migrate":
        import psycopg
        with psycopg.connect(settings.tw_database_url) as conn:
            with open("src/tailwatch/db/schema.sql", "r") as f:
                schema_sql = f.read()
            with conn.cursor() as cur:
                cur.execute(schema_sql)
            conn.commit()
        print("Database migrations applied successfully.")
    elif cmd == "seed":
        run_seed()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
