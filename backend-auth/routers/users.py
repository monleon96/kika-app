from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models import User, UserSettings
from schemas import (
    AdminCreateUserRequest,
    AdminDeactivateUserRequest,
    AdminListUsersResponse,
    AdminUser,
    OkResponse,
    UserStatusResponse,
    UserSettingsSchema,
)
from security import hash_password
from settings import get_settings


router = APIRouter(tags=["users"])

settings = get_settings()

ADMIN_HEADER_NAME = "X-Admin-Key"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def require_admin(x_admin_key: str = Header(..., alias=ADMIN_HEADER_NAME)) -> None:
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


@router.get("/users/{email}", response_model=UserStatusResponse)
async def get_user_status(email: str, session: AsyncSession = Depends(get_session)) -> UserStatusResponse:
    email_normalized = email.lower()
    result = await session.execute(select(User).where(User.email == email_normalized))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserStatusResponse(email=user.email, verified=bool(user.verified_at), is_active=user.is_active)


@router.get("/users/{email}/settings", response_model=UserSettingsSchema)
async def get_user_settings(email: str, session: AsyncSession = Depends(get_session)) -> UserSettingsSchema:
    email_normalized = email.lower()
    result = await session.execute(select(User).where(User.email == email_normalized))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Load settings
    result = await session.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        return UserSettingsSchema(data={})
    
    return UserSettingsSchema(data=settings.data, updated_at=settings.updated_at)


@router.post("/users/{email}/settings", response_model=OkResponse)
async def update_user_settings(
    email: str, 
    payload: UserSettingsSchema, 
    session: AsyncSession = Depends(get_session)
) -> OkResponse:
    email_normalized = email.lower()
    result = await session.execute(select(User).where(User.email == email_normalized))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check if settings exist
    result = await session.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    
    if settings:
        settings.data = payload.data
    else:
        settings = UserSettings(user_id=user.id, data=payload.data)
        session.add(settings)
    
    await session.commit()
    return OkResponse()


@router.post("/admin/users/create", response_model=AdminUser)
async def admin_create_user(
    payload: AdminCreateUserRequest,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    email = payload.email.lower()
    result = await session.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password) if payload.password else None,
        is_active=payload.is_active,
    )
    if payload.verified:
        user.verified_at = _now()

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AdminUser.model_validate(user)


@router.post("/admin/users/deactivate", response_model=OkResponse)
async def admin_deactivate_user(
    payload: AdminDeactivateUserRequest,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    email = payload.email.lower()
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    await session.commit()
    return OkResponse()


@router.get("/admin/users/list", response_model=AdminListUsersResponse)
async def admin_list_users(
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> AdminListUsersResponse:
    total_result = await session.execute(select(func.count()).select_from(User))
    total = total_result.scalar_one()

    result = await session.execute(
        select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = result.scalars().all()
    return AdminListUsersResponse(items=[AdminUser.model_validate(u) for u in users], count=total)
