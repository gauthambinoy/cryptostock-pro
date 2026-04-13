"""
Event Trading Signals Router
AI-powered event detection and trading signal generation.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from ..auth import get_current_user
from ..models import User
from ..services.event_signals_service import (
    get_live_signals, get_symbol_events, get_event_calendar,
    get_signal_accuracy, get_trending_symbols,
)

router = APIRouter(prefix="/api/event-signals", tags=["Event Signals"])


@router.get("/live")
async def live_signals(
    event_type: Optional[str] = None,
    impact: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    return get_live_signals(event_type, impact, direction, limit)


@router.get("/symbol/{symbol}")
async def symbol_events(symbol: str, user: User = Depends(get_current_user)):
    return get_symbol_events(symbol)


@router.get("/calendar")
async def calendar(user: User = Depends(get_current_user)):
    return get_event_calendar()


@router.get("/accuracy")
async def accuracy(user: User = Depends(get_current_user)):
    return get_signal_accuracy()


@router.get("/trending")
async def trending(user: User = Depends(get_current_user)):
    return get_trending_symbols()
