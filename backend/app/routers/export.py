"""
Export API endpoints (PDF data + CSV)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service
from datetime import datetime

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/portfolio/{portfolio_id}/pdf")
async def export_portfolio_pdf_data(
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
    holdings_data = []

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
        gl = value - invested
        gl_pct = (gl / invested * 100) if invested > 0 else 0
        holdings_data.append({
            "symbol": holding.symbol, "name": holding.name or holding.symbol,
            "asset_type": holding.asset_type.value, "quantity": holding.quantity,
            "buy_price": holding.buy_price, "current_price": round(price, 2),
            "value": round(value, 2), "gain_loss": round(gl, 2), "gain_loss_percent": round(gl_pct, 2),
        })

    allocation = {}
    for h in holdings_data:
        allocation[h["symbol"]] = round(h["value"] / current_value * 100, 2) if current_value > 0 else 0

    total_gl = current_value - total_invested
    return {
        "portfolio_name": portfolio.name, "generated_at": datetime.utcnow().isoformat(),
        "total_invested": round(total_invested, 2), "current_value": round(current_value, 2),
        "gain_loss": round(total_gl, 2),
        "gain_loss_percent": round((total_gl / total_invested * 100) if total_invested > 0 else 0, 2),
        "holdings_count": len(holdings_data), "holdings": holdings_data, "allocation": allocation,
    }


@router.get("/portfolio/{portfolio_id}/csv")
async def export_portfolio_csv(
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
    lines = ["Symbol,Name,Type,Quantity,Buy Price,Current Price,Value,Gain/Loss,Gain/Loss %"]
    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)
        price = quote.price if quote else holding.buy_price
        value = holding.quantity * price
        invested = holding.quantity * holding.buy_price
        gl = value - invested
        gl_pct = (gl / invested * 100) if invested > 0 else 0
        lines.append(f"{holding.symbol},{holding.name or holding.symbol},{holding.asset_type.value},{holding.quantity},{holding.buy_price},{price:.2f},{value:.2f},{gl:.2f},{gl_pct:.2f}")

    return Response(content="\n".join(lines), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={portfolio.name}_holdings.csv"})
