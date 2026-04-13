"""
Options Flow & Greeks Analysis API Routes
Options chain, Greeks calculator, IV surface, unusual activity detection.
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging

from ..services.options_service import (
    calculate_greeks,
    calculate_option_price,
    calculate_implied_volatility,
    generate_expiration_dates,
    generate_options_chain,
    detect_unusual_activity,
    generate_iv_surface,
    calculate_put_call_ratio,
    calculate_profit_loss,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/options", tags=["options"])


# --------------- Request / Response Models ---------------

class GreeksRequest(BaseModel):
    spot_price: float = Field(..., gt=0, description="Current price of the underlying")
    strike: float = Field(..., gt=0, description="Strike price")
    expiration_days: float = Field(..., gt=0, description="Days to expiration")
    risk_free_rate: float = Field(0.05, ge=0, description="Annualised risk-free rate")
    volatility: float = Field(..., gt=0, le=5.0, description="Annualised volatility (e.g. 0.30 for 30%)")
    option_type: Literal["call", "put"] = "call"


class OptionLeg(BaseModel):
    strike: float = Field(..., gt=0)
    premium: float = Field(..., ge=0)
    quantity: int = Field(..., ge=1)
    option_type: Literal["call", "put"]
    side: Literal["buy", "sell"] = "buy"


class ProfitLossRequest(BaseModel):
    legs: List[OptionLeg] = Field(..., min_length=1, max_length=8)
    spot_price: float = Field(..., gt=0)
    price_range_pct: float = Field(30, gt=0, le=100)


# --------------- Endpoints ---------------

@router.get("/chain/{symbol}")
async def get_options_chain(
    symbol: str,
    expiration_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    option_type: str = Query("all", regex="^(call|put|all)$"),
):
    """Full options chain for a symbol at a given expiration."""
    try:
        if not expiration_date:
            expirations = generate_expiration_dates()
            expiration_date = expirations[0] if expirations else None
            if not expiration_date:
                raise HTTPException(status_code=400, detail="No expiration dates available")

        chain = generate_options_chain(symbol.upper(), expiration_date, option_type)
        return chain
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating options chain for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate options chain")


@router.get("/expirations/{symbol}")
async def get_expirations(symbol: str):
    """Available expiration dates for a symbol."""
    return {
        "symbol": symbol.upper(),
        "expirations": generate_expiration_dates(),
    }


@router.post("/calculate-greeks")
async def compute_greeks(req: GreeksRequest):
    """Calculate Black-Scholes Greeks for custom inputs."""
    T = req.expiration_days / 365.0
    greeks = calculate_greeks(
        req.spot_price, req.strike, T, req.risk_free_rate, req.volatility, req.option_type,
    )
    price = calculate_option_price(
        req.spot_price, req.strike, T, req.risk_free_rate, req.volatility, req.option_type,
    )
    iv = calculate_implied_volatility(
        price, req.spot_price, req.strike, T, req.risk_free_rate, req.option_type,
    )
    return {
        "inputs": req.dict(),
        "price": round(price, 4),
        "implied_volatility": iv,
        **greeks,
    }


@router.get("/unusual-activity")
async def get_unusual_activity(
    limit: int = Query(30, ge=1, le=100),
):
    """Unusual options activity across the market."""
    return {"alerts": detect_unusual_activity(limit)}


@router.get("/iv-surface/{symbol}")
async def get_iv_surface(symbol: str):
    """Implied volatility surface data for heatmap rendering."""
    return generate_iv_surface(symbol.upper())


@router.get("/put-call-ratio/{symbol}")
async def get_put_call_ratio(symbol: str):
    """Put/call ratio analysis."""
    return calculate_put_call_ratio(symbol.upper())


@router.post("/profit-loss")
async def compute_profit_loss(req: ProfitLossRequest):
    """P&L calculator for option strategies."""
    legs = [leg.dict() for leg in req.legs]
    return calculate_profit_loss(legs, req.spot_price, req.price_range_pct)
