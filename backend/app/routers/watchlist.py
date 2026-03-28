"""
Watchlist API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])


@router.get("/")
async def get_watchlist(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == current_user.id
    ).order_by(models.WatchlistItem.added_at.desc()).all()

    market_service = get_market_service()
    result = []

    for item in items:
        if item.asset_type == models.AssetType.CRYPTO:
            quote = await market_service.get_crypto_quote(item.symbol)
        else:
            quote = market_service.get_stock_quote(item.symbol)

        result.append({
            "id": item.id,
            "symbol": item.symbol,
            "asset_type": item.asset_type.value,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "current_price": quote.price if quote else None,
            "change": quote.change if quote else None,
            "change_percent": quote.change_percent if quote else None,
            "name": quote.name if quote else item.symbol,
        })

    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    symbol: str,
    asset_type: str = "stock",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == current_user.id,
        models.WatchlistItem.symbol == symbol.upper()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")

    item = models.WatchlistItem(
        user_id=current_user.id,
        symbol=symbol.upper(),
        asset_type=models.AssetType(asset_type)
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {"id": item.id, "symbol": item.symbol, "asset_type": item.asset_type.value}


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    item_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == item_id,
        models.WatchlistItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
