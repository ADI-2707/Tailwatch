import uuid
from typing import List, Optional
import psycopg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from tailwatch.core.config import settings

router = APIRouter(prefix="/v1", tags=["alert-rules"])

class CreateRuleRequest(BaseModel):
    project_slug: str
    name: str
    query: str
    threshold: float = 50
    window_s: int = 300
    comparator: str = "above"
    severity: str = "warning"
    channel_ids: List[str] = []

class CreateChannelRequest(BaseModel):
    project_slug: str
    name: str
    kind: str
    webhook_url: str

@router.get("/alert-rules")
async def list_alert_rules(project_slug: Optional[str] = "production"):
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT r.id, r.name, r.query, r.threshold, r.window_s, r.enabled, r.severity,
                       COALESCE(i.state, 'ok') as current_state
                FROM alert_rules r
                LEFT JOIN alert_instances i ON i.rule_id = r.id
                ORDER BY r.created_at DESC;
            """)
            rows = await cur.fetchall()
            rules = []
            for r in rows:
                rules.append({
                    "id": str(r[0]),
                    "name": r[1],
                    "query": r[2],
                    "threshold": float(r[3]),
                    "window_m": int(r[4] / 60) if r[4] >= 60 else 1,
                    "enabled": r[5],
                    "severity": r[6],
                    "state": r[7]
                })
            return {"rules": rules, "count": len(rules)}

@router.post("/alert-rules")
async def create_alert_rule(payload: CreateRuleRequest):
    rule_id = uuid.uuid4()
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM projects WHERE slug = %s;", (payload.project_slug,))
            p_row = await cur.fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Project not found")
            project_id = p_row[0]

            channel_uuids = [uuid.UUID(ch) for ch in payload.channel_ids] if payload.channel_ids else []

            await cur.execute("""
                INSERT INTO alert_rules (id, project_id, name, query, threshold, window_s, comparator, severity, channel_ids)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, query, threshold, window_s, enabled;
            """, (rule_id, project_id, payload.name, payload.query, payload.threshold, payload.window_s, payload.comparator, payload.severity, channel_uuids))
            row = await cur.fetchone()
            await conn.commit()

            return {
                "id": str(row[0]),
                "name": row[1],
                "query": row[2],
                "threshold": float(row[3]),
                "window_m": int(row[4] / 60),
                "enabled": row[5],
                "state": "ok"
            }

@router.post("/channels")
async def create_channel(payload: CreateChannelRequest):
    channel_id = uuid.uuid4()
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM projects WHERE slug = %s;", (payload.project_slug,))
            p_row = await cur.fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Project not found")
            project_id = p_row[0]

            await cur.execute("""
                INSERT INTO channels (id, project_id, name, kind, config_enc)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, kind;
            """, (channel_id, project_id, payload.name, payload.kind, payload.webhook_url))
            row = await cur.fetchone()
            await conn.commit()

            return {
                "id": str(row[0]),
                "name": row[1],
                "kind": row[2]
            }
