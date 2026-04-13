"""
DeFi Yield Aggregator Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..auth import get_current_user
from ..database import get_db
from ..models import User, DeFiWatchlist
from ..services.defi_service import get_yields, get_protocols, get_chains, get_yield_comparison

router = APIRouter(prefix="/api/defi", tags=["DeFi"])


@router.get("/yields")
async def yields(
    chain: Optional[str] = None,
    category: Optional[str] = None,
    min_tvl: float = Query(0, ge=0),
    min_apy: float = Query(0, ge=0),
    max_apy: float = Query(10000, ge=0),
    sort_by: str = Query("apy", pattern="^(apy|tvl|risk)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
):
    return await get_yields(chain, category, min_tvl, min_apy, max_apy, sort_by, limit, offset)


@router.get("/protocols")
async def protocols(user: User = Depends(get_current_user)):
    return await get_protocols()


@router.get("/chains")
async def chains(user: User = Depends(get_current_user)):
    return await get_chains()


@router.get("/yield-comparison")
async def yield_comparison(
    asset: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
):
    return await get_yield_comparison(asset)


@router.post("/watchlist")
async def add_to_watchlist(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = DeFiWatchlist(
        user_id=user.id,
        protocol=data.get("protocol", ""),
        pool_id=data.get("pool_id", ""),
        chain=data.get("chain", ""),
        asset=data.get("asset", ""),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "message": "Added to DeFi watchlist"}


@router.get("/watchlist")
async def get_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(DeFiWatchlist).filter(DeFiWatchlist.user_id == user.id).all()
    return [
        {
            "id": i.id,
            "protocol": i.protocol,
            "pool_id": i.pool_id,
            "chain": i.chain,
            "asset": i.asset,
            "added_at": i.added_at.isoformat() if i.added_at else None,
        }
        for i in items
    ]


@router.delete("/watchlist/{item_id}")
async def remove_from_watchlist(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(DeFiWatchlist).filter(
        DeFiWatchlist.id == item_id, DeFiWatchlist.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Removed from watchlist"}
