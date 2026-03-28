"""
Transaction history API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from datetime import datetime

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.get("/")
async def get_transactions(
    portfolio_id: Optional[int] = None,
    symbol: Optional[str] = None,
    transaction_type: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    )

    if portfolio_id:
        query = query.filter(models.Transaction.portfolio_id == portfolio_id)
    if symbol:
        query = query.filter(models.Transaction.symbol == symbol.upper())
    if transaction_type:
        query = query.filter(models.Transaction.transaction_type == transaction_type)

    transactions = query.order_by(models.Transaction.transaction_date.desc()).all()

    return [
        {
            "id": t.id,
            "portfolio_id": t.portfolio_id,
            "symbol": t.symbol,
            "name": t.name,
            "asset_type": t.asset_type.value,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "price": t.price,
            "total_amount": t.total_amount,
            "notes": t.notes,
            "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in transactions
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == data["portfolio_id"],
        models.Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    total_amount = data["quantity"] * data["price"]

    transaction = models.Transaction(
        user_id=current_user.id,
        portfolio_id=data["portfolio_id"],
        symbol=data["symbol"].upper(),
        name=data.get("name", data["symbol"].upper()),
        asset_type=models.AssetType(data["asset_type"]),
        transaction_type=data["transaction_type"],
        quantity=data["quantity"],
        price=data["price"],
        total_amount=total_amount,
        notes=data.get("notes"),
        transaction_date=datetime.fromisoformat(data["transaction_date"]) if isinstance(data["transaction_date"], str) else data["transaction_date"],
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return {
        "id": transaction.id,
        "symbol": transaction.symbol,
        "transaction_type": transaction.transaction_type,
        "total_amount": transaction.total_amount,
    }


@router.get("/export")
async def export_transactions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(models.Transaction.transaction_date.desc()).all()

    csv_lines = ["Date,Symbol,Name,Type,Asset Type,Quantity,Price,Total,Notes"]
    for t in transactions:
        date_str = t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else ""
        notes = (t.notes or "").replace(",", ";").replace("\n", " ")
        csv_lines.append(
            f"{date_str},{t.symbol},{t.name or ''},{t.transaction_type},"
            f"{t.asset_type.value},{t.quantity},{t.price},{t.total_amount},{notes}"
        )

    return Response(
        content="\n".join(csv_lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"}
    )


@router.get("/summary")
async def get_transaction_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

    total_buys = sum(t.total_amount for t in transactions if t.transaction_type == "buy")
    total_sells = sum(t.total_amount for t in transactions if t.transaction_type == "sell")

    return {
        "total_buys": round(total_buys, 2),
        "total_sells": round(total_sells, 2),
        "net_invested": round(total_buys - total_sells, 2),
        "total_transactions": len(transactions),
    }
