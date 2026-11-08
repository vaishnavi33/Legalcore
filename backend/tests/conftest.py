import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/test.db")
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["ADMIN_PASSWORD"] = "Admin@12345"
os.environ["RATE_LIMIT_LOGIN_PER_MIN"] = "1000"
os.environ["RATE_LIMIT_CREATE_PER_MIN"] = "1000"
os.environ["RATE_LIMIT_TRACK_PER_MIN"] = "1000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import Base, SessionLocal, engine  # noqa: E402
from app.core.ratelimit import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_admin, seed_catalogue, seed_demo  # noqa: E402

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_catalogue(db)
        seed_admin(db)
        seed_demo(db)
        db.commit()
    limiter.reset()
    yield


class Api:
    """Test client that behaves like the website: cookie session plus the CSRF header."""

    def __init__(self):
        self.c = TestClient(app)
        self.c.headers["X-Requested-With"] = "legalcore"

    def login(self, ident, password="Demo@12345"):
        r = self.c.post("/api/v1/auth/login", json={"identifier": ident, "password": password})
        assert r.status_code == 200, r.text
        return self

    def create(self, files=None, **data):
        import json

        body = {
            "audience": "individual",
            "service": "advocate-consultation",
            "branch": "hyderabad",
            "name": "Test Person",
            "phone": "9876543210",
            "message": "My landlord is not returning the deposit.",
            "consent": True,
        }
        body.update(data)
        return self.c.post("/api/v1/requests", data={"data": json.dumps(body)}, files=files or [])

    def __getattr__(self, name):
        return getattr(self.c, name)


@pytest.fixture
def api():
    return Api()


@pytest.fixture
def make_api():
    return Api
