"""
Intraday trading intelligence router.
Provides: market pulse, signals, whale feed, liquidations, funding rates.
No auth required — personal trading tool.
"""
from fastapi import APIRouter, Query
from ..services.intraday_service import get_intraday_service

router = APIRouter(prefix="/api/intraday", tags=["Intraday"])


@router.get("/market-pulse")
async def market_pulse():
    """BTC price, Fear & Greed index, BTC dominance, total market cap."""
    svc = get_intraday_service()
    return await svc.get_market_pulse()


@router.get("/signals")
async def signals(
    capital: float = Query(50.0, ge=1.0, le=100_000.0, description="Trading budget in EUR"),
    risk_pct: float = Query(2.0, ge=0.5, le=10.0, description="Max risk per trade (%)"),
):
    """
    Analyze 60+ crypto instruments and return ranked intraday signals.
    Each signal includes: direction (LONG/SHORT/NEUTRAL), strength 0-100,
    algorithm breakdown, and leverage trade plan calculated for your capital.
    """
    svc = get_intraday_service()
    return await svc.get_signals(capital, risk_pct)


@router.get("/whale-feed")
async def whale_feed():
    """Recent large trades (>$80k notional) across top symbols."""
    svc = get_intraday_service()
    return await svc.get_whale_feed()


@router.get("/liquidations")
async def liquidations():
    """Recent forced liquidations from Binance futures."""
    svc = get_intraday_service()
    return await svc.get_recent_liquidations()


@router.get("/funding-rates")
async def funding_rates():
    """Current perpetual futures funding rates sorted by magnitude."""
    svc = get_intraday_service()
    return await svc.get_funding_rates_list()
