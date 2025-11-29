from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from emailer import send_password_reset_email, send_verification_email
from models import User
from schemas import ForgotPasswordRequest, LoginRequest, OkResponse, RegisterRequest, ResetPasswordRequest
from security import (
    SimpleRateLimiter,
    hash_password,
    generate_reset_token,
    generate_verification_token,
    verify_password,
    verify_reset_token,
    verify_verification_token,
)
from settings import get_settings


router = APIRouter(tags=["auth"])

settings = get_settings()

register_limiter_email = SimpleRateLimiter(max_hits=5, window_seconds=60)
register_limiter_ip = SimpleRateLimiter(max_hits=10, window_seconds=60)
login_limiter_email = SimpleRateLimiter(max_hits=10, window_seconds=60)
login_limiter_ip = SimpleRateLimiter(max_hits=20, window_seconds=60)
password_limiter_email = SimpleRateLimiter(max_hits=5, window_seconds=60)
password_limiter_ip = SimpleRateLimiter(max_hits=10, window_seconds=60)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/register", response_model=OkResponse)
async def register_user(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    email = payload.email.lower()
    register_limiter_email.check(email)
    if request.client and request.client.host:
        register_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")
        if payload.password:
            user.password_hash = hash_password(payload.password)
    else:
        user = User(
            email=email,
            password_hash=hash_password(payload.password) if payload.password else None,
        )
        session.add(user)

    await session.commit()

    token = generate_verification_token(email)
    verify_url = f"{str(settings.public_base_url).rstrip('/')}/verify?token={token}"
    
    # Send email in background, but don't fail registration if email fails
    try:
        background_tasks.add_task(send_verification_email, email, verify_url)
    except Exception as e:
        # Log error but continue (email is not critical for registration)
        import logging
        logging.error(f"Failed to queue verification email: {e}")
    
    return OkResponse()


@router.get("/verify", response_class=HTMLResponse)
async def verify_email(token: str, session: AsyncSession = Depends(get_session)) -> HTMLResponse:
    email = verify_verification_token(token)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return HTMLResponse(status_code=404, content="<!DOCTYPE html><p>❌ User not found.</p>")
    if not user.is_active:
        return HTMLResponse(status_code=400, content="<!DOCTYPE html><p>🚫 Account inactive.</p>")

    if not user.verified_at:
        user.verified_at = _now()
        await session.commit()

    return HTMLResponse(content="<!DOCTYPE html><p>✅ Email verified.</p>")


@router.post("/login", response_model=OkResponse)
async def login(payload: LoginRequest, request: Request, session: AsyncSession = Depends(get_session)) -> OkResponse:
    email = payload.email.lower()
    login_limiter_email.check(email)
    if request.client and request.client.host:
        login_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.is_active or not user.verified_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = _now()
    await session.commit()
    return OkResponse()


@router.post("/password/forgot", response_model=OkResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    email = payload.email.lower()
    password_limiter_email.check(email)
    if request.client and request.client.host:
        password_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = generate_reset_token(email)
        reset_url = f"{str(settings.public_base_url).rstrip('/')}/password/reset?token={token}"
        background_tasks.add_task(send_password_reset_email, email, reset_url)

    return OkResponse()


@router.post("/password/reset", response_model=OkResponse)
async def reset_password(payload: ResetPasswordRequest, session: AsyncSession = Depends(get_session)) -> OkResponse:
    email = verify_reset_token(payload.token).lower()

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")

    user.password_hash = hash_password(payload.new_password)
    if not user.verified_at:
        user.verified_at = _now()

    await session.commit()
    return OkResponse()
