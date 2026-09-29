"""
Shared test helpers — exposes the single in-memory SQLite engine,
TestingSessionLocal, and TestClient so test modules can import them directly.

Uses StaticPool so all connections (setup code + HTTP requests) share the
same in-memory SQLite database.

The DB setup/teardown lifecycle is managed by conftest.py's `reset_db` fixture.
"""
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db
from app.auth import require_auth, _decode

# ── Single shared in-memory engine with StaticPool ───────────────────────────
# StaticPool ensures every call to engine.connect() returns the SAME underlying
# connection, so tables created during setup are visible to HTTP request handlers.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _mock_require_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            return _decode(token)
        except Exception:
            pass
    if request.url.path.startswith("/admin"):
        return {"sub": "admin-1", "role": "admin"}
    # The /handovers/confirm endpoint requires role=="recycler".
    # We set sub to a placeholder that won't match any specific recycler_id
    # so ownership checks use the payload's recycler_id directly.
    if request.url.path.startswith("/handovers/confirm"):
        return {"sub": "__test_bypass__", "role": "recycler"}
    return {"sub": "__test_bypass__", "role": "collector"}


# Install overrides once at import time
app.dependency_overrides[get_db] = _override_get_db
app.dependency_overrides[require_auth] = _mock_require_auth

# ── Shared TestClient ────────────────────────────────────────────────────────
client = TestClient(app)
