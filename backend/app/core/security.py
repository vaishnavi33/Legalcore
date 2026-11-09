import hashlib
import hmac
import secrets
from datetime import UTC, date, datetime, timedelta, timezone

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
    payload = {"sub": user_id, "ver": token_version, "typ": "session", "iat": now, "exp": now + timedelta(minutes=s.access_token_minutes)}
    return jwt.encode(payload, s.secret_key, algorithm=ALGO)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None


def create_scoped_token(purpose: str, subject: str, minutes: int, **claims) -> str:
    """Short-lived token for one job, such as a guest tracking session or a single file download."""
    now = datetime.now(UTC)
    payload = {"sub": subject, "typ": purpose, "iat": now, "exp": now + timedelta(minutes=minutes), **claims}
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGO)


def decode_scoped_token(token: str, purpose: str) -> dict | None:
    data = decode_access_token(token)
    if not data or data.get("typ") != purpose:
        return None
    return data


# One-time codes: six digits, stored only as a keyed hash.
def new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str, salt: str) -> str:
    return hmac.new(get_settings().secret_key.encode(), f"{salt}:{code}".encode(), hashlib.sha256).hexdigest()


def otp_matches(code: str, salt: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_otp(code.strip(), salt), hashed)


# India does not observe daylight saving, so a fixed offset is exact.
IST = timezone(timedelta(hours=5, minutes=30), "IST")
MIN_NEEDED_BY_DAYS = 2


def india_today() -> date:
    return datetime.now(IST).date()


def earliest_needed_by() -> date:
    """A request submitted on 9 November can ask for 11 November at the earliest."""
    return india_today() + timedelta(days=MIN_NEEDED_BY_DAYS)


# Request numbers: LC-XXXX-XXXX from an alphabet without look-alike characters (no 0/O, 1/I).
# Older numbers carry a branch code (LC-HYD-XXXX-XXXX) and keep working.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_request_number() -> str:
    code = "".join(secrets.choice(_ALPHABET) for _ in range(8))
    return f"LC-{code[:4]}-{code[4:]}"
