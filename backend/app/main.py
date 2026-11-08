from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import admin, auth, catalog, requests, track
from app.core.config import get_settings
from app.core.db import engine

settings = get_settings()

app = FastAPI(
    title="Legal Core API",
    version="1.0.0",
    docs_url=None if settings.is_production else "/api/docs",
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

UNSAFE = {"POST", "PATCH", "PUT", "DELETE"}


@app.middleware("http")
async def security(request: Request, call_next):
    # CSRF protection for cookie sessions: browsers cannot add this header on a cross-site form post.
    if request.method in UNSAFE and request.url.path.startswith("/api/") and request.cookies.get(settings.cookie_name):
        if request.headers.get("x-requested-with") != "legalcore":
            return JSONResponse({"detail": "Missing request header."}, status_code=403)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if request.url.path.startswith("/api/") and "cache-control" not in response.headers:
        response.headers["Cache-Control"] = "no-store"
    return response


v1 = APIRouter(prefix="/api/v1")
v1.include_router(auth.router)
v1.include_router(catalog.router)
v1.include_router(requests.router)
v1.include_router(track.router)
v1.include_router(admin.router)
app.include_router(v1)


@app.get("/api/health", tags=["health"])
def health():
    with engine.connect() as c:
        c.execute(text("select 1"))
    return {"status": "ok"}
