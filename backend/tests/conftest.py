import pytest
from fastapi import Request
from app.main import app
from app.auth import require_auth, _decode

def mock_require_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            return _decode(token)
        except Exception:
            pass
    if request.url.path.startswith("/admin"):
        return {"sub": "admin-1", "role": "admin"}
    return {"sub": "col-uuid-1", "role": "collector"}

@pytest.fixture(autouse=True)
def override_auth_for_tests():
    app.dependency_overrides[require_auth] = mock_require_auth
    yield
