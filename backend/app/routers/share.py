"""
Share portfolio API endpoints
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service

router = APIRouter(prefix="/api/share", tags=["Share Portfolio"])

shared_portfolios = {}


@router.post("/{portfolio_id}")
async def create_share(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    total_invested = 0
    current_value = 0
    top_holdings = []

    for holding in portfolio.holdings:
        invested = holding.quantity * holding.buy_price
        total_invested += invested
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)
        price = quote.price if quote else holding.buy_price
        value = holding.quantity * price
        current_value += value
        top_holdings.append({
            "symbol": holding.symbol, "name": holding.name, "value": round(value, 2),
            "gain_loss_percent": round(((price - holding.buy_price) / holding.buy_price * 100) if holding.buy_price > 0 else 0, 2),
        })

    top_holdings.sort(key=lambda x: x["value"], reverse=True)
    gain_loss = current_value - total_invested
    gain_loss_pct = (gain_loss / total_invested * 100) if total_invested > 0 else 0

    share_id = str(uuid.uuid4())
    shared_portfolios[share_id] = {
        "portfolio_name": portfolio.name, "total_value": round(current_value, 2),
        "total_gain_loss": round(gain_loss, 2), "total_gain_loss_percent": round(gain_loss_pct, 2),
        "holdings_count": len(portfolio.holdings), "top_holdings": top_holdings[:5],
        "created_at": datetime.utcnow().isoformat(),
    }

    return {"share_id": share_id, "url": f"/shared/{share_id}"}


@router.get("/{share_id}")
async def get_shared_portfolio(share_id: str):
    data = shared_portfolios.get(share_id)
    if not data:
        raise HTTPException(status_code=404, detail="Shared portfolio not found or expired")
    return data
