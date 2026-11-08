from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import or_, select

from app.api.deps import DB, CurrentUser, OptionalUser
from app.api.serializers import user_out
from app.core.config import get_settings
from app.core.ratelimit import client_ip, limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Role, User, UserRole
from app.schemas import LoginIn, RegisterIn, UserOut, normalize_mobile
from app.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])

# A fixed hash so a login for an unknown account takes as long as a wrong password.
_DUMMY_HASH = hash_password("not-a-real-password")


def _set_cookie(response: Response, user: User) -> None:
    s = get_settings()
    response.set_cookie(
        s.cookie_name,
        create_access_token(str(user.id), user.token_version),
        max_age=s.access_token_minutes * 60,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, request: Request, response: Response, db: DB):
    limiter.check(f"register:{client_ip(request)}", get_settings().rate_limit_login_per_min)
    email = body.email.lower() if body.email else None
    conds = [User.mobile == body.mobile] + ([User.email == email] if email else [])
    if db.scalar(select(User).where(or_(*conds))):
        raise HTTPException(status_code=409, detail="An account with this mobile number or email already exists. Please sign in.")
    user = User(name=body.name, mobile=body.mobile, email=email, password_hash=hash_password(body.password))
    user.roles.append(UserRole(role=Role.CLIENT))
    db.add(user)
    db.flush()
    audit(db, user, "user.register", "user", str(user.id), client_ip(request))
    db.commit()
    db.refresh(user)
    _set_cookie(response, user)
    return user_out(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request, response: Response, db: DB):
    ip = client_ip(request)
    limiter.check(f"login:{ip}", get_settings().rate_limit_login_per_min)
    ident = body.identifier.strip()
    if "@" in ident:
        user = db.scalar(select(User).where(User.email == ident.lower()))
    else:
        try:
            user = db.scalar(select(User).where(User.mobile == normalize_mobile(ident)))
        except ValueError:
            user = None
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not ok or not user.is_active:
        audit(db, user, "user.login_failed", "user", str(user.id) if user else ident[:64], ip)
        db.commit()
        raise HTTPException(status_code=401, detail="Mobile number, email or password is not correct.")
    audit(db, user, "user.login", "user", str(user.id), ip)
    db.commit()
    _set_cookie(response, user)
    return user_out(user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    s = get_settings()
    response.delete_cookie(s.cookie_name, path="/", httponly=True, secure=s.cookie_secure, samesite="lax")
    return Response(status_code=204, headers=response.headers)


@router.post("/logout-everywhere", status_code=204)
def logout_everywhere(user: CurrentUser, response: Response, db: DB):
    user.token_version += 1
    db.commit()
    s = get_settings()
    response.delete_cookie(s.cookie_name, path="/")
    return Response(status_code=204, headers=response.headers)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user_out(user)


@router.get("/session", response_model=UserOut | None)
def session(user: OptionalUser):
    """Like /me, but answers null instead of 401 for visitors who are not signed in."""
    return user_out(user) if user else None
