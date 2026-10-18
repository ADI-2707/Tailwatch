import hashlib
import os
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False

def generate_session_token() -> str:
    return secrets.token_hex(32)

def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
