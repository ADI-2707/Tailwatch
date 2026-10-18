import asyncio
import ipaddress
import socket
from urllib.parse import urlparse
import httpx
import psycopg
from tailwatch.core.config import settings

def is_ssrf_safe(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)

        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False

        if ip_str == "169.254.169.254":
            return False

        return True
    except Exception:
        return False

async def deliver_slack(webhook_url: str, payload_json: str):
    if not is_ssrf_safe(webhook_url):
        raise ValueError("Blocked by SSRF guard")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(webhook_url, content=payload_json, headers={"Content-Type": "application/json"})
        resp.raise_for_status()

async def run_notifier():
    while True:
        try:
            async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
                async with conn.cursor() as cur:
                    await cur.execute("""
                        SELECT id, channel_id, kind, payload, attempts
                        FROM notifications
                        WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= now())
                        ORDER BY id ASC
                        FOR UPDATE SKIP LOCKED
                        LIMIT 5;
                    """)
                    rows = await cur.fetchall()

                    for r in rows:
                        notif_id = r[0]
                        channel_id = r[1]
                        kind = r[2]
                        payload = r[3]
                        attempts = r[4]

                        try:
                            await cur.execute("SELECT config_enc FROM channels WHERE id = %s;", (channel_id,))
                            ch_row = await cur.fetchone()
                            if ch_row and ch_row[0]:
                                webhook_url = ch_row[0]
                                await deliver_slack(webhook_url, payload)

                            await cur.execute("""
                                UPDATE notifications
                                SET status = 'delivered', sent_at = now()
                                WHERE id = %s;
                            """, (notif_id,))
                        except Exception as ex:
                            next_delay = 10 * (2 ** attempts)
                            await cur.execute("""
                                UPDATE notifications
                                SET status = CASE WHEN %s >= 5 THEN 'failed' ELSE 'pending' END,
                                    attempts = attempts + 1,
                                    next_attempt_at = now() + make_interval(secs => %s),
                                    last_error = %s
                                WHERE id = %s;
                            """, (attempts + 1, next_delay, str(ex), notif_id))

                        await conn.commit()

            await asyncio.sleep(2)
        except Exception:
            await asyncio.sleep(5)

def start():
    asyncio.run(run_notifier())
