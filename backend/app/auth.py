"""Small signed bearer-session helper for the prototype API."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_SECRET = os.getenv("SECRET_KEY", "kabadiwala-dev-secret-change-me").encode()
_bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + 60 * 60 * 24}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(_SECRET, encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def _decode(token: str) -> dict[str, Any]:
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(_SECRET, encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        padded = encoded + "=" * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode())
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired token")
        if not payload.get("sub") or not payload.get("role"):
            raise ValueError("invalid claims")
        return payload
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from exc


def require_auth(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return _decode(credentials.credentials)


def require_roles(*roles: str):
    def dependency(principal: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
        if principal.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal
    return dependency
