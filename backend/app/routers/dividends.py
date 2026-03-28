"""
Dividend tracking API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from datetime import datetime
from collections import defaultdict

router = APIRouter(prefix="/api/dividends", tags=["Dividends"])


@router.get("/")
async def get_dividends(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    dividends = db.query(models.Dividend).filter(
        models.Dividend.user_id == current_user.id
    ).order_by(models.Dividend.payment_date.desc()).all()

    return [
        {
            "id": d.id,
            "symbol": d.symbol,
            "amount_per_share": d.amount_per_share,
            "shares_held": d.shares_held,
            "total_amount": d.total_amount,
            "payment_date": d.payment_date.isoformat() if d.payment_date else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in dividends
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_dividend(
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    total = data["amount_per_share"] * data["shares_held"]

    dividend = models.Dividend(
        user_id=current_user.id,
        symbol=data["symbol"].upper(),
        amount_per_share=data["amount_per_share"],
        shares_held=data["shares_held"],
        total_amount=total,
        payment_date=datetime.fromisoformat(data["payment_date"]) if isinstance(data["payment_date"], str) else data["payment_date"],
    )

    db.add(dividend)
    db.commit()
    db.refresh(dividend)

    return {
        "id": dividend.id,
        "symbol": dividend.symbol,
        "total_amount": dividend.total_amount,
    }


@router.delete("/{dividend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dividend(
    dividend_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    dividend = db.query(models.Dividend).filter(
        models.Dividend.id == dividend_id,
        models.Dividend.user_id == current_user.id
    ).first()

    if not dividend:
        raise HTTPException(status_code=404, detail="Dividend not found")

    db.delete(dividend)
    db.commit()


@router.get("/summary")
async def get_dividend_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    dividends = db.query(models.Dividend).filter(
        models.Dividend.user_id == current_user.id
    ).all()

    total_income = sum(d.total_amount for d in dividends)
    by_symbol = defaultdict(float)
    for d in dividends:
        by_symbol[d.symbol] += d.total_amount

    return {
        "total_dividend_income": round(total_income, 2),
        "projected_annual": round(total_income * 4, 2),
        "total_records": len(dividends),
        "dividend_by_symbol": dict(by_symbol),
    }
