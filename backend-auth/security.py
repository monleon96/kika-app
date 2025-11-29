from __future__ import annotations

from datetime import datetime
from typing import Dict

from fastapi import HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from settings import get_settings


pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")

_TOKEN_SALT_VERIFY = "verify-email"
_TOKEN_SALT_RESET = "reset-password"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return pwd_context.verify(password, password_hash)


def _serializer(salt: str) -> URLSafeTimedSerializer:
    settings = get_settings()
    return URLSafeTimedSerializer(secret_key=settings.jwt_secret, salt=salt)


def generate_verification_token(email: str) -> str:
    email_normalized = email.lower()
    serializer = _serializer(_TOKEN_SALT_VERIFY)
    return serializer.dumps({"email": email_normalized, "purpose": "verify"})


def verify_verification_token(token: str) -> str:
    settings = get_settings()
    serializer = _serializer(_TOKEN_SALT_VERIFY)
    try:
        payload = serializer.loads(token, max_age=settings.jwt_expire_min * 60)
    except SignatureExpired as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired") from exc
    except BadSignature as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token") from exc

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")
    return email


def generate_reset_token(email: str) -> str:
    serializer = _serializer(_TOKEN_SALT_RESET)
    return serializer.dumps({"email": email.lower(), "purpose": "reset"})


def verify_reset_token(token: str) -> str:
    settings = get_settings()
    serializer = _serializer(_TOKEN_SALT_RESET)
    try:
        payload = serializer.loads(token, max_age=settings.reset_token_expire_min * 60)
    except SignatureExpired as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired") from exc
    except BadSignature as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token") from exc

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")
    return email


class SimpleRateLimiter:
    """Naive in-memory rate limiter keyed by string (email or IP)."""

    def __init__(self, max_hits: int, window_seconds: int) -> None:
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: Dict[str, Dict[str, float]] = {}

    def check(self, key: str) -> None:
        now = datetime.utcnow().timestamp()
        bucket = self._hits.setdefault(key, {"count": 0, "reset": now + self.window_seconds})
        if now > bucket["reset"]:
            bucket["count"] = 0
            bucket["reset"] = now + self.window_seconds

        if bucket["count"] >= self.max_hits:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Try again later.",
            )

        bucket["count"] += 1
