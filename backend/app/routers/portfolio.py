"""
Portfolio management API endpoints
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, auth, models
from ..services.market_data import get_market_service
from ..services.portfolio_metrics import (
    calculate_holding_metrics,
    calculate_portfolio_metrics,
    calculate_allocation
)

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[schemas.PortfolioResponse])
async def get_portfolios(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get all portfolios for the current user (paginated)
    """
    query = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id
    )
    portfolios = query.offset(offset).limit(limit).all()

    market_service = get_market_service()
    result = []

    # Collect all unique symbols across all portfolios for batch fetching
    all_symbols: Dict[str, str] = {}
    for portfolio in portfolios:
        for holding in portfolio.holdings:
            symbol = holding.symbol
            asset_type = holding.asset_type.value if hasattr(holding.asset_type, 'value') else str(holding.asset_type)
            all_symbols[symbol] = asset_type

    # Batch fetch all quotes at once
    quotes = await market_service.batch_fetch_quotes(all_symbols) if all_symbols else {}

    for portfolio in portfolios:
        total_value = 0
        total_invested = 0

        for holding in portfolio.holdings:
            quote = quotes.get(holding.symbol)
            if quote:
                total_value += holding.quantity * quote.price
            total_invested += holding.quantity * holding.buy_price

        gain_loss = total_value - total_invested
        gain_loss_percent = (gain_loss / total_invested * 100) if total_invested > 0 else 0

        result.append(schemas.PortfolioResponse(
            id=portfolio.id,
            name=portfolio.name,
            created_at=portfolio.created_at,
            total_value=round(total_value, 2),
            total_gain_loss=round(gain_loss, 2),
            total_gain_loss_percent=round(gain_loss_percent, 2)
        ))

    return result


@router.post("/", response_model=schemas.PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio_data: schemas.PortfolioCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new portfolio
    """
    portfolio = models.Portfolio(
        name=portfolio_data.name,
        user_id=current_user.id
    )
    
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    
    return schemas.PortfolioResponse(
        id=portfolio.id,
        name=portfolio.name,
        created_at=portfolio.created_at,
        total_value=0,
        total_gain_loss=0,
        total_gain_loss_percent=0
    )


@router.get("/{portfolio_id}/holdings", response_model=List[schemas.HoldingResponse])
async def get_holdings(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all holdings in a portfolio (excludes soft-deleted)
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
        models.Portfolio.is_deleted == False
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    market_service = get_market_service()

    # Get only non-deleted holdings
    active_holdings = [h for h in portfolio.holdings if not h.is_deleted]

    # Batch fetch all quotes at once
    symbols_dict = {
        h.symbol: (h.asset_type.value if hasattr(h.asset_type, 'value') else str(h.asset_type))
        for h in active_holdings
    }
    quotes = await market_service.batch_fetch_quotes(symbols_dict) if symbols_dict else {}

    result = []
    for holding in active_holdings:
        quote = quotes.get(holding.symbol)
        current_price = quote.price if quote else holding.buy_price
        metrics = calculate_holding_metrics(holding, current_price)

        result.append(schemas.HoldingResponse(
            id=holding.id,
            symbol=holding.symbol,
            name=holding.name,
            asset_type=holding.asset_type,
            quantity=holding.quantity,
            buy_price=holding.buy_price,
            buy_date=holding.buy_date,
            notes=holding.notes,
            **metrics
        ))

    return result


@router.post("/{portfolio_id}/holdings", response_model=schemas.HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    portfolio_id: int,
    holding_data: schemas.HoldingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new holding to a portfolio
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Get asset name if not provided
    market_service = get_market_service()
    name = holding_data.name

    if not name:
        asset_type_val = holding_data.asset_type.value if hasattr(holding_data.asset_type, 'value') else str(holding_data.asset_type)
        quote = (await market_service.batch_fetch_quotes({holding_data.symbol.upper(): asset_type_val})).get(holding_data.symbol.upper())
        if quote:
            name = quote.name

    holding = models.Holding(
        portfolio_id=portfolio_id,
        symbol=holding_data.symbol.upper(),
        name=name or holding_data.symbol.upper(),
        asset_type=models.AssetType(holding_data.asset_type.value),
        quantity=holding_data.quantity,
        buy_price=holding_data.buy_price,
        buy_date=holding_data.buy_date,
        notes=holding_data.notes
    )

    db.add(holding)
    db.commit()
    db.refresh(holding)

    # Get current price for response
    asset_type_val = holding_data.asset_type.value if hasattr(holding_data.asset_type, 'value') else str(holding_data.asset_type)
    quote = (await market_service.batch_fetch_quotes({holding.symbol: asset_type_val})).get(holding.symbol)
    current_price = quote.price if quote else holding.buy_price
    metrics = calculate_holding_metrics(holding, current_price)

    return schemas.HoldingResponse(
        id=holding.id,
        symbol=holding.symbol,
        name=holding.name,
        asset_type=holding.asset_type,
        quantity=holding.quantity,
        buy_price=holding.buy_price,
        buy_date=holding.buy_date,
        notes=holding.notes,
        **metrics
    )


@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=schemas.HoldingResponse)
async def update_holding(
    portfolio_id: int,
    holding_id: int,
    holding_data: schemas.HoldingUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a holding
    """
    holding = db.query(models.Holding).join(models.Portfolio).filter(
        models.Holding.id == holding_id,
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )

    if holding_data.quantity is not None:
        holding.quantity = holding_data.quantity
    if holding_data.buy_price is not None:
        holding.buy_price = holding_data.buy_price
    if holding_data.buy_date is not None:
        holding.buy_date = holding_data.buy_date
    if holding_data.notes is not None:
        holding.notes = holding_data.notes

    db.commit()
    db.refresh(holding)

    # Get current price
    market_service = get_market_service()
    asset_type_val = holding.asset_type.value if hasattr(holding.asset_type, 'value') else str(holding.asset_type)
    quote = (await market_service.batch_fetch_quotes({holding.symbol: asset_type_val})).get(holding.symbol)
    current_price = quote.price if quote else holding.buy_price
    metrics = calculate_holding_metrics(holding, current_price)

    return schemas.HoldingResponse(
        id=holding.id,
        symbol=holding.symbol,
        name=holding.name,
        asset_type=holding.asset_type,
        quantity=holding.quantity,
        buy_price=holding.buy_price,
        buy_date=holding.buy_date,
        notes=holding.notes,
        **metrics
    )


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    portfolio_id: int,
    holding_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a holding from portfolio (soft delete)
    """
    holding = db.query(models.Holding).join(models.Portfolio).filter(
        models.Holding.id == holding_id,
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
        models.Holding.is_deleted == False
    ).first()

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )

    # Soft delete - mark as deleted instead of removing
    holding.is_deleted = True
    holding.deleted_at = datetime.utcnow()
    db.commit()
    logger.info(f"Soft deleted holding {holding_id} for user {current_user.id}")


@router.get("/{portfolio_id}/performance", response_model=schemas.PortfolioPerformance)
async def get_portfolio_performance(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed portfolio performance metrics
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    market_service = get_market_service()

    # Batch fetch all quotes at once
    symbols_dict = {
        h.symbol: (h.asset_type.value if hasattr(h.asset_type, 'value') else str(h.asset_type))
        for h in portfolio.holdings
    }
    quotes = await market_service.batch_fetch_quotes(symbols_dict) if symbols_dict else {}

    total_invested = 0
    current_value = 0
    allocation = {}
    holdings_with_metrics = []

    for holding in portfolio.holdings:
        quote = quotes.get(holding.symbol)
        price = quote.price if quote else holding.buy_price
        value = holding.quantity * price
        invested = holding.quantity * holding.buy_price

        total_invested += invested
        current_value += value

        metrics = calculate_holding_metrics(holding, price)
        holdings_with_metrics.append({
            "holding": holding,
            "metrics": metrics
        })

    # Calculate allocation
    for item in holdings_with_metrics:
        h = item["holding"]
        m = item["metrics"]
        allocation[h.symbol] = round((m["current_value"] / current_value * 100) if current_value > 0 else 0, 2)

    # Find best and worst performers
    sorted_holdings = sorted(holdings_with_metrics, key=lambda x: x["metrics"]["gain_loss_percent"], reverse=True)

    best = None
    worst = None

    if sorted_holdings:
        best_item = sorted_holdings[0]
        best = schemas.HoldingResponse(
            id=best_item["holding"].id,
            symbol=best_item["holding"].symbol,
            name=best_item["holding"].name,
            asset_type=best_item["holding"].asset_type,
            quantity=best_item["holding"].quantity,
            buy_price=best_item["holding"].buy_price,
            buy_date=best_item["holding"].buy_date,
            notes=best_item["holding"].notes,
            **best_item["metrics"]
        )

        worst_item = sorted_holdings[-1]
        worst = schemas.HoldingResponse(
            id=worst_item["holding"].id,
            symbol=worst_item["holding"].symbol,
            name=worst_item["holding"].name,
            asset_type=worst_item["holding"].asset_type,
            quantity=worst_item["holding"].quantity,
            buy_price=worst_item["holding"].buy_price,
            buy_date=worst_item["holding"].buy_date,
            notes=worst_item["holding"].notes,
            **worst_item["metrics"]
        )

    gain_loss = current_value - total_invested
    gain_loss_percent = (gain_loss / total_invested * 100) if total_invested > 0 else 0

    return schemas.PortfolioPerformance(
        total_invested=round(total_invested, 2),
        current_value=round(current_value, 2),
        total_gain_loss=round(gain_loss, 2),
        total_gain_loss_percent=round(gain_loss_percent, 2),
        best_performer=best,
        worst_performer=worst,
        allocation=allocation,
        history=[]  # TODO: Implement historical tracking
    )
