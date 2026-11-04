import asyncio
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import psycopg
from tailwatch.core.config import settings

class AlertState:
    OK = "ok"
    PENDING = "pending"
    FIRING = "firing"
    RESOLVED = "resolved"

class Alerter:
    def __init__(self, lock_key: int = 8947291):
        self.lock_key = lock_key
        self.is_leader = False

    async def run(self):
        while True:
            try:
                async with await psycopg.AsyncConnection.connect(settings.tw_database_url, autocommit=True) as conn:
                    async with conn.cursor() as cur:
                        await cur.execute("SELECT pg_try_advisory_lock(%s);", (self.lock_key,))
                        row = await cur.fetchone()
                        if row and row[0]:
                            self.is_leader = True
                            while True:
                                await self._evaluate_all_rules(conn)
                                await asyncio.sleep(15)
                        else:
                            self.is_leader = False
                            await asyncio.sleep(5)
            except Exception:
                self.is_leader = False
                await asyncio.sleep(5)

    async def _evaluate_all_rules(self, conn: psycopg.AsyncConnection):
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT id, project_id, name, kind, query, window_s, comparator, threshold, for_s, resolve_after, cooldown_s, channel_ids
                FROM alert_rules
                WHERE enabled = true;
            """)
            rules = await cur.fetchall()

            for rule in rules:
                rule_id = rule[0]
                project_id = rule[1]
                rule_name = rule[2]
                window_s = rule[5]
                comparator = rule[6]
                threshold = rule[7]
                channel_ids = rule[11] or []

                now = datetime.now(timezone.utc)
                window_start = now - timedelta(seconds=window_s)

                await cur.execute("""
                    SELECT count(*) FROM logs
                    WHERE project_id = %s AND ts >= %s AND ts <= %s;
                """, (project_id, window_start, now))
                count_res = await cur.fetchone()
                val = count_res[0] if count_res else 0

                is_triggered = False
                if comparator in ("above", ">") and val > threshold:
                    is_triggered = True
                elif comparator in ("above_or_equal", ">=") and val >= threshold:
                    is_triggered = True
                elif comparator in ("below", "<") and val < threshold:
                    is_triggered = True

                fingerprint = hashlib.sha256(f"{rule_id}".encode()).hexdigest()

                await cur.execute("""
                    SELECT state, since FROM alert_instances
                    WHERE rule_id = %s AND fingerprint = %s;
                """, (rule_id, fingerprint))
                inst = await cur.fetchone()

                current_state = inst[0] if inst else AlertState.OK
                next_state = current_state

                if current_state == AlertState.OK and is_triggered:
                    next_state = AlertState.PENDING
                elif current_state == AlertState.PENDING:
                    if is_triggered:
                        next_state = AlertState.FIRING
                    else:
                        next_state = AlertState.OK
                elif current_state == AlertState.FIRING:
                    if not is_triggered:
                        next_state = AlertState.RESOLVED
                elif current_state == AlertState.RESOLVED:
                    if is_triggered:
                        next_state = AlertState.FIRING
                    else:
                        next_state = AlertState.OK

                if next_state != current_state or not inst:
                    await cur.execute("""
                        INSERT INTO alert_instances (rule_id, fingerprint, state, since, last_eval_at, last_value)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (rule_id, fingerprint)
                        DO UPDATE SET state = EXCLUDED.state, last_eval_at = EXCLUDED.last_eval_at, last_value = EXCLUDED.last_value;
                    """, (rule_id, fingerprint, next_state, now, now, val))

                    if next_state in (AlertState.FIRING, AlertState.RESOLVED):
                        for ch_id in channel_ids:
                            await cur.execute("""
                                INSERT INTO notifications (incident_id, channel_id, kind, payload, status)
                                VALUES (gen_random_uuid(), %s, %s, %s, 'pending');
                            """, (ch_id, next_state, f'{{"rule": "{rule_name}", "state": "{next_state}", "value": {val}}}'))

def start():
    alerter = Alerter()
    asyncio.run(alerter.run())
