import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import decode_access_token
from app.models import User

DB = Annotated[Session, Depends(get_db)]


def _token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(get_settings().cookie_name)


def optional_user(request: Request, db: DB) -> User | None:
    tok = _token(request)
    if not tok:
        return None
    data = decode_access_token(tok)
    if not data or data.get("typ", "session") != "session":
        return None
    try:
        user = db.get(User, uuid.UUID(data["sub"]))
    except (KeyError, ValueError):
        return None
    if not user or not user.is_active or user.token_version != data.get("ver"):
        return None
    return user


def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def staff_user(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="This page is for Legal Core staff.")
    return user


def admin_user(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can do this.")
    return user


def manager_user(user: Annotated[User, Depends(current_user)]) -> User:
    from app.models import Role

    if not (user.is_admin or user.has(Role.BRANCH_MANAGER)):
        raise HTTPException(status_code=403, detail="Only branch managers and administrators can do this.")
    return user


OptionalUser = Annotated[User | None, Depends(optional_user)]
CurrentUser = Annotated[User, Depends(current_user)]
StaffUser = Annotated[User, Depends(staff_user)]
AdminUser = Annotated[User, Depends(admin_user)]
ManagerUser = Annotated[User, Depends(manager_user)]
