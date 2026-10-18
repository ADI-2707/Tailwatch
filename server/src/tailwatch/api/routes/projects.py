import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List
import psycopg
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from tailwatch.core.config import settings
from tailwatch.api.deps import verify_api_key

router = APIRouter(prefix="/v1", tags=["projects-and-keys"])

class CreateProjectRequest(BaseModel):
    name: str
    slug: str
    retention_days: int = 14

class CreateAPIKeyRequest(BaseModel):
    name: str
    scopes: List[str] = ["ingest"]

@router.post("/projects")
async def create_project(payload: CreateProjectRequest):
    project_id = uuid.uuid4()
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute("""
                    INSERT INTO projects (id, slug, name, retention_days)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, slug, name, retention_days, created_at;
                """, (project_id, payload.slug, payload.name, payload.retention_days))
                row = await cur.fetchone()
                await conn.commit()
                return {
                    "id": str(row[0]),
                    "slug": row[1],
                    "name": row[2],
                    "retention_days": row[3],
                    "created_at": row[4].isoformat()
                }
            except Exception as ex:
                raise HTTPException(status_code=400, detail=str(ex))

@router.get("/projects/{slug}")
async def get_project(slug: str):
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT id, slug, name, retention_days, created_at
                FROM projects WHERE slug = %s;
            """, (slug,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            return {
                "id": str(row[0]),
                "slug": row[1],
                "name": row[2],
                "retention_days": row[3],
                "created_at": row[4].isoformat()
            }

@router.post("/projects/{slug}/keys")
async def create_api_key(slug: str, payload: CreateAPIKeyRequest):
    key_id = uuid.uuid4()
    raw_secret = uuid.uuid4().hex + uuid.uuid4().hex
    prefix = raw_secret[:8]
    full_token = f"twk_live_{prefix}_{raw_secret}"
    token_hash = hashlib.sha256(full_token.encode()).hexdigest()

    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM projects WHERE slug = %s;", (slug,))
            p_row = await cur.fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Project not found")
            project_id = p_row[0]

            await cur.execute("""
                INSERT INTO api_keys (id, project_id, name, key_prefix, key_hash, scopes)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (key_id, project_id, payload.name, prefix, token_hash, payload.scopes))
            await conn.commit()

            return {
                "id": str(key_id),
                "name": payload.name,
                "key_prefix": prefix,
                "token": full_token,
                "scopes": payload.scopes
            }
