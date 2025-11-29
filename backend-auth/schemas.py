from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OkResponse(BaseModel):
    ok: bool = True


class RegisterRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = Field(default=None, min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class UserStatusResponse(BaseModel):
    email: EmailStr
    verified: bool
    is_active: bool


class MetricsEventRequest(BaseModel):
    email: EmailStr
    event_name: str = Field(min_length=1, max_length=255)
    props: Optional[Dict[str, Any]] = None


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = Field(default=None, min_length=8)
    verified: bool = False
    is_active: bool = True


class UserSettingsSchema(BaseModel):
    data: Dict[str, Any]
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminDeactivateUserRequest(BaseModel):
    email: EmailStr


class AdminUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    created_at: datetime
    verified_at: Optional[datetime]
    is_active: bool
    last_login_at: Optional[datetime]


class AdminEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[EmailStr]
    event_name: str
    ts: datetime
    props: Optional[Dict[str, Any]]


class AdminListUsersResponse(BaseModel):
    items: List[AdminUser]
    count: int


class AdminListEventsResponse(BaseModel):
    items: List[AdminEvent]
    count: int
