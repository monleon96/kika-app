from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models import Event
from schemas import AdminEvent, AdminListEventsResponse, MetricsEventRequest, OkResponse
from .users import require_admin


router = APIRouter(tags=["metrics"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/metrics", response_model=OkResponse)
async def ingest_event(payload: MetricsEventRequest, session: AsyncSession = Depends(get_session)) -> OkResponse:
    event = Event(
        email=payload.email.lower(),
        event_name=payload.event_name,
        props=payload.props,
        ts=_now(),
    )
    session.add(event)
    await session.commit()
    return OkResponse()


@router.get("/admin/events/list", response_model=AdminListEventsResponse)
async def admin_list_events(
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    email: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> AdminListEventsResponse:
    query = select(Event).order_by(Event.ts.desc()).limit(limit).offset(offset)
    count_query = select(func.count()).select_from(Event)

    if email:
        email_normalized = email.lower()
        query = query.where(Event.email == email_normalized)
        count_query = count_query.where(Event.email == email_normalized)

    result = await session.execute(query)
    events = result.scalars().all()

    count_result = await session.execute(count_query)
    total = count_result.scalar_one()

    return AdminListEventsResponse(
        items=[AdminEvent.model_validate(event) for event in events],
        count=total,
    )
