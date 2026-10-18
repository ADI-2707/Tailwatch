import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import psycopg
from fastapi import APIRouter, HTTPException, Response, Request, status, Cookie
from pydantic import BaseModel, EmailStr
from tailwatch.core.config import settings
from tailwatch.core.security import hash_password, verify_password, generate_session_token, hash_session_token

router = APIRouter(prefix="/v1/auth", tags=["auth"])

class SetupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    project_name: str
    project_slug: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.get("/status")
async def get_auth_status(request: Request):
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT count(*) FROM users;")
            row = await cur.fetchone()
            user_count = row[0] if row else 0

            if user_count == 0:
                return {"initialized": False, "authenticated": False, "user": None}

            session_token = request.cookies.get("tw_session")
            if not session_token:
                return {"initialized": True, "authenticated": False, "user": None}

            token_hash = hash_session_token(session_token)
            await cur.execute("""
                SELECT u.id, u.email, u.name
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = %s AND s.expires_at > now() AND u.is_active = true;
            """, (token_hash,))
            user_row = await cur.fetchone()

            if not user_row:
                return {"initialized": True, "authenticated": False, "user": None}

            return {
                "initialized": True,
                "authenticated": True,
                "user": {
                    "id": str(user_row[0]),
                    "email": user_row[1],
                    "name": user_row[2]
                }
            }

@router.post("/setup")
async def setup_initial_admin(payload: SetupRequest, response: Response):
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT count(*) FROM users;")
            row = await cur.fetchone()
            if row and row[0] > 0:
                raise HTTPException(status_code=400, detail="Tailwatch is already initialized")

            user_id = uuid.uuid4()
            pwd_hash = hash_password(payload.password)

            await cur.execute("""
                INSERT INTO users (id, email, name, password_hash, is_active)
                VALUES (%s, %s, %s, %s, true);
            """, (user_id, payload.email, payload.name, pwd_hash))

            project_id = uuid.uuid4()
            await cur.execute("""
                INSERT INTO projects (id, slug, name, retention_days)
                VALUES (%s, %s, %s, 14)
                ON CONFLICT (slug) DO NOTHING;
            """, (project_id, payload.project_slug, payload.project_name))

            await cur.execute("""
                INSERT INTO memberships (user_id, project_id, role)
                VALUES (%s, %s, 'owner');
            """, (user_id, project_id))

            raw_token = generate_session_token()
            token_hash = hash_session_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(days=14)

            await cur.execute("""
                INSERT INTO sessions (id, user_id, token_hash, expires_at)
                VALUES (%s, %s, %s, %s);
            """, (uuid.uuid4(), user_id, token_hash, expires_at))

            await conn.commit()

            response.set_cookie(
                key="tw_session",
                value=raw_token,
                max_age=14 * 86400,
                httponly=True,
                samesite="lax",
                secure=False
            )

            return {
                "status": "initialized",
                "user": {"id": str(user_id), "email": payload.email, "name": payload.name},
                "project": {"id": str(project_id), "slug": payload.project_slug, "name": payload.project_name}
            }

@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT id, email, name, password_hash, is_active
                FROM users WHERE email = %s;
            """, (payload.email,))
            user_row = await cur.fetchone()

            if not user_row or not user_row[4]:
                raise HTTPException(status_code=401, detail="Invalid email or password")

            user_id = user_row[0]
            email = user_row[1]
            name = user_row[2]
            pwd_hash = user_row[3]

            if not verify_password(payload.password, pwd_hash):
                raise HTTPException(status_code=401, detail="Invalid email or password")

            raw_token = generate_session_token()
            token_hash = hash_session_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(days=14)

            await cur.execute("""
                INSERT INTO sessions (id, user_id, token_hash, expires_at)
                VALUES (%s, %s, %s, %s);
            """, (uuid.uuid4(), user_id, token_hash, expires_at))

            await cur.execute("UPDATE users SET last_login_at = now() WHERE id = %s;", (user_id,))
            await conn.commit()

            response.set_cookie(
                key="tw_session",
                value=raw_token,
                max_age=14 * 86400,
                httponly=True,
                samesite="lax",
                secure=False
            )

            return {
                "status": "authenticated",
                "user": {"id": str(user_id), "email": email, "name": name}
            }

@router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("tw_session")
    if session_token:
        token_hash = hash_session_token(session_token)
        async with await psycopg.AsyncConnection.connect(settings.tw_database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM sessions WHERE token_hash = %s;", (token_hash,))
                await conn.commit()

    response.delete_cookie(key="tw_session")
    return {"status": "logged_out"}
