"""
Backtesting API endpoints
"""
import logging
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import schemas, auth, models
from ..database import get_db
from ..services.backtest_service import get_backtest_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backtest", tags=["Backtesting"])


@router.post("/run", response_model=schemas.BacktestResponse)
async def run_backtest(
    request: schemas.BacktestRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run a backtest on a symbol
    """
    try:
        if request.start_date >= request.end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )

        service = get_backtest_service()

        # Run backtest
        results = service.backtest_strategy(
            symbol=request.symbol.upper(),
            asset_type=request.asset_type.value,
            start_date=request.start_date,
            end_date=request.end_date,
            strategy=request.strategy,
            db=db
        )

        if "error" in results:
            raise HTTPException(
                status_code=400,
                detail=results["error"]
            )

        # Save results to database
        backtest = service.save_backtest_results(current_user.id, results, db)

        if not backtest:
            raise HTTPException(
                status_code=500,
                detail="Failed to save backtest results"
            )

        # Format response
        return schemas.BacktestResponse(
            id=backtest.id,
            symbol=backtest.symbol,
            asset_type=backtest.asset_type,
            strategy=backtest.strategy,
            start_date=backtest.start_date,
            end_date=backtest.end_date,
            total_return_percent=backtest.total_return_percent,
            annual_return_percent=backtest.annual_return_percent,
            sharpe_ratio=backtest.sharpe_ratio,
            max_drawdown_percent=backtest.max_drawdown_percent,
            win_rate_percent=backtest.win_rate_percent,
            total_trades=backtest.total_trades,
            benchmark_return_percent=backtest.benchmark_return_percent,
            outperformance_percent=backtest.outperformance_percent,
            equity_curve=json.loads(backtest.equity_curve) if backtest.equity_curve else [],
            trades=json.loads(backtest.trades) if backtest.trades else [],
            monthly_returns=json.loads(backtest.monthly_returns) if backtest.monthly_returns else {},
            monte_carlo_stats=json.loads(backtest.monte_carlo_stats) if backtest.monte_carlo_stats else {},
            created_at=backtest.created_at
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{backtest_id}", response_model=schemas.BacktestResponse)
async def get_backtest(
    backtest_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get backtest results by ID
    """
    try:
        service = get_backtest_service()
        backtest = service.get_backtest(backtest_id, db)

        if not backtest:
            raise HTTPException(status_code=404, detail="Backtest not found")

        if backtest.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this backtest")

        return schemas.BacktestResponse(
            id=backtest.id,
            symbol=backtest.symbol,
            asset_type=backtest.asset_type,
            strategy=backtest.strategy,
            start_date=backtest.start_date,
            end_date=backtest.end_date,
            total_return_percent=backtest.total_return_percent,
            annual_return_percent=backtest.annual_return_percent,
            sharpe_ratio=backtest.sharpe_ratio,
            max_drawdown_percent=backtest.max_drawdown_percent,
            win_rate_percent=backtest.win_rate_percent,
            total_trades=backtest.total_trades,
            benchmark_return_percent=backtest.benchmark_return_percent,
            outperformance_percent=backtest.outperformance_percent,
            equity_curve=json.loads(backtest.equity_curve) if backtest.equity_curve else [],
            trades=json.loads(backtest.trades) if backtest.trades else [],
            monthly_returns=json.loads(backtest.monthly_returns) if backtest.monthly_returns else {},
            monte_carlo_stats=json.loads(backtest.monte_carlo_stats) if backtest.monte_carlo_stats else {},
            created_at=backtest.created_at
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error retrieving backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[schemas.BacktestSummary])
async def list_user_backtests(
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's backtests
    """
    try:
        service = get_backtest_service()
        backtests = service.get_user_backtests(current_user.id, limit, db)

        return [
            schemas.BacktestSummary(
                id=bt.id,
                symbol=bt.symbol,
                asset_type=bt.asset_type,
                strategy=bt.strategy,
                start_date=bt.start_date,
                end_date=bt.end_date,
                total_return_percent=bt.total_return_percent,
                sharpe_ratio=bt.sharpe_ratio,
                created_at=bt.created_at
            )
            for bt in backtests
        ]

    except Exception as e:
        logger.error(f"Error listing backtests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-periods", response_model=dict)
async def get_available_periods():
    """
    Get available backtest periods
    """
    return {
        "periods": [
            {"label": "5 Years", "days": 365 * 5},
            {"label": "10 Years", "days": 365 * 10},
            {"label": "20 Years", "days": 365 * 20},
            {"label": "3 Years", "days": 365 * 3},
            {"label": "1 Year", "days": 365},
        ]
    }
