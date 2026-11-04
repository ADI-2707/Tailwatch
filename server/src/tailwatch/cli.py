import sys
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

def main():
    if len(sys.argv) < 2:
        print("Usage: tailwatch [api|writer|worker|alerter|notifier|maintenance|migrate]")
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
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
