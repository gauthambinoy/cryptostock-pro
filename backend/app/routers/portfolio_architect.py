"""
Portfolio Architect Router - AI-powered portfolio generation
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Portfolio, Holding
from ..services.portfolio_architect_service import generate_portfolio, get_templates

router = APIRouter(prefix="/api/portfolio-architect", tags=["Portfolio Architect"])


class GenerateRequest(BaseModel):
    age: int = Field(..., ge=18, le=100)
    investment_amount: float = Field(..., gt=0)
    risk_tolerance: str = Field(..., pattern="^(conservative|moderate|aggressive)$")
    investment_horizon: str = Field(..., pattern="^(short|medium|long)$")
    interests: List[str] = Field(default_factory=list)


class ApplyRequest(BaseModel):
    portfolio_name: str
    assets: List[dict]


@router.post("/generate")
async def generate(request: GenerateRequest, user: User = Depends(get_current_user)):
    """Generate an AI-optimized portfolio based on user profile."""
    result = generate_portfolio(
        age=request.age,
        investment_amount=request.investment_amount,
        risk_tolerance=request.risk_tolerance,
        investment_horizon=request.investment_horizon,
        interests=request.interests,
    )
    return result


@router.post("/apply")
async def apply_portfolio(
    request: ApplyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a real portfolio from the generated recommendation."""
    from datetime import datetime

    portfolio = Portfolio(
        name=request.portfolio_name,
        user_id=user.id,
    )
    db.add(portfolio)
    db.flush()

    for asset in request.assets:
        holding = Holding(
            portfolio_id=portfolio.id,
            symbol=asset["symbol"],
            name=asset.get("name", asset["symbol"]),
            asset_type=asset.get("asset_type", "stock"),
            quantity=0,
            buy_price=0,
            buy_date=datetime.utcnow(),
            notes=f"AI Architect: {asset.get('allocation_pct', 0)}% allocation",
        )
        db.add(holding)

    db.commit()
    db.refresh(portfolio)

    return {
        "message": "Portfolio created successfully",
        "portfolio_id": portfolio.id,
        "name": portfolio.name,
        "holdings_count": len(request.assets),
    }


@router.get("/templates")
async def templates(user: User = Depends(get_current_user)):
    """Get pre-built portfolio templates."""
    return get_templates()
