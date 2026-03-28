"""
Leaderboard API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("/")
async def get_leaderboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get top 20 users by portfolio performance.
    Usernames are anonymized (first 2 chars + ***).
    """
    # Get all users that have at least one portfolio with holdings
    users = db.query(models.User).filter(
        models.User.is_active == True
    ).all()

    market_service = get_market_service()
    user_performances = []

    for user in users:
        portfolios = db.query(models.Portfolio).filter(
            models.Portfolio.user_id == user.id
        ).all()

        if not portfolios:
            continue

        total_invested = 0.0
        total_current_value = 0.0

        for portfolio in portfolios:
            for holding in portfolio.holdings:
                invested = holding.quantity * holding.buy_price
                total_invested += invested

                # Get current price
                if holding.asset_type == models.AssetType.CRYPTO:
                    quote = await market_service.get_crypto_quote(holding.symbol)
                else:
                    quote = market_service.get_stock_quote(holding.symbol)

                if quote:
                    total_current_value += holding.quantity * quote.price
                else:
                    total_current_value += invested

        if total_invested <= 0:
            continue

        total_return_percent = round(
            (total_current_value - total_invested) / total_invested * 100, 2
        )

        # Anonymize username: first 2 chars + ***
        username = user.username
        if len(username) >= 2:
            anonymized = username[:2] + "***"
        else:
            anonymized = username[0] + "***" if username else "***"

        user_performances.append({
            "username": anonymized,
            "total_return_percent": total_return_percent,
            "portfolio_value": round(total_current_value, 2),
        })

    # Sort by total_return_percent descending and take top 20
    user_performances.sort(key=lambda x: x["total_return_percent"], reverse=True)
    top_20 = user_performances[:20]

    # Add rank
    result = []
    for i, entry in enumerate(top_20, start=1):
        result.append({
            "rank": i,
            "username": entry["username"],
            "total_return_percent": entry["total_return_percent"],
            "portfolio_value": entry["portfolio_value"],
        })

    return result
