import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

ALGO = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: str, token_version: int) -> str:
    s = get_settings()
    now = datetime.now(UTC)
    payload = {"sub": user_id, "ver": token_version, "iat": now, "exp": now + timedelta(minutes=s.access_token_minutes)}
    return jwt.encode(payload, s.secret_key, algorithm=ALGO)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None


# Request numbers: LC-<BRANCH>-XXXX-XXXX from an alphabet without look-alike characters (no 0/O, 1/I).
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_request_number(branch_code: str) -> str:
    code = "".join(secrets.choice(_ALPHABET) for _ in range(8))
    return f"LC-{branch_code}-{code[:4]}-{code[4:]}"
