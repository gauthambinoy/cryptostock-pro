"""
Live Trading Router
Handles Alpaca integration endpoints for buying/selling and account management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging

from ..database import get_db
from .. import auth, models
from ..services.trading_service import TradingManager, get_trading_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trading", tags=["Trading"])


# ============== Schemas ==============

class ConnectAlpacaRequest(BaseModel):
    """Request to connect Alpaca account"""
    api_key: str = Field(..., min_length=1)
    secret_key: str = Field(..., min_length=1)
    trading_mode: str = Field(default="paper", pattern="^(paper|live)$")


class PlaceOrderRequest(BaseModel):
    """Request to place an order"""
    symbol: str = Field(..., min_length=1, max_length=5)
    quantity: float = Field(..., gt=0, le=100000)
    order_type: str = Field(default="market", pattern="^(market|limit)$")
    limit_price: Optional[float] = Field(default=None, gt=0)
    stop_loss: Optional[float] = Field(default=None, gt=0)
    prediction_id: Optional[int] = None
    prediction_direction: Optional[str] = None
    prediction_confidence: Optional[float] = Field(default=None, ge=0, le=100)


class BuyOrderRequest(PlaceOrderRequest):
    """Request to buy"""
    pass


class SellOrderRequest(BaseModel):
    """Request to sell"""
    symbol: str = Field(..., min_length=1, max_length=5)
    quantity: float = Field(..., gt=0, le=100000)
    order_type: str = Field(default="market", pattern="^(market|limit)$")
    limit_price: Optional[float] = Field(default=None, gt=0)


class AccountResponse(BaseModel):
    """Account information response"""
    account_balance: float
    buying_power: float
    day_pnl: float
    day_pnl_percent: float
    trading_mode: str
    is_connected: bool
    last_synced: Optional[datetime]


class PositionResponse(BaseModel):
    """Position information response"""
    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    market_value: float
    unrealized_pl: float
    unrealized_pl_pct: float
    side: str


class OrderResponse(BaseModel):
    """Order information response"""
    id: str
    symbol: str
    side: str
    quantity: float
    filled_quantity: float
    price: float
    filled_price: Optional[float]
    status: str
    order_type: str
    created_at: datetime
    executed_at: Optional[datetime] = None


class TradeExecutionResponse(BaseModel):
    """Trade execution response"""
    id: int
    symbol: str
    side: str
    quantity: float
    filled_quantity: float
    price: float
    filled_price: Optional[float]
    status: str
    order_type: str
    pnl: Optional[float]
    pnl_percent: Optional[float]
    prediction_direction: Optional[str]
    prediction_confidence: Optional[float]
    prediction_accuracy: Optional[bool]
    created_at: datetime
    executed_at: Optional[datetime]


class TradeStatsResponse(BaseModel):
    """Trading statistics response"""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    avg_pnl: float
    best_trade: float
    worst_trade: float


# ============== Routes ==============

@router.post("/connect", tags=["Account"])
async def connect_alpaca_account(
    request: ConnectAlpacaRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Connect Alpaca trading account

    OAuth-like integration where user provides API credentials.
    Credentials are encrypted and stored securely.

    Args:
        request: Alpaca API key and secret key
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message with account info
    """
    manager = get_trading_manager(db)
    success, message = manager.connect_account(
        user_id=current_user.id,
        api_key=request.api_key,
        secret_key=request.secret_key,
        trading_mode=request.trading_mode,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    account_info = manager.get_account_info(current_user.id)

    return {
        "success": True,
        "message": message,
        "account": account_info,
    }


@router.delete("/disconnect", tags=["Account"])
async def disconnect_account(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disconnect trading account

    Removes stored API credentials and disables trading.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    manager = get_trading_manager(db)
    success = manager.disconnect_account(current_user.id)

    if not success:
        raise HTTPException(status_code=500, detail="Error disconnecting account")

    return {"success": True, "message": "Account disconnected"}


@router.get("/account", response_model=AccountResponse, tags=["Account"])
async def get_account(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get account information

    Includes balance, buying power, day P&L, etc.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Account information
    """
    manager = get_trading_manager(db)
    account_info = manager.get_account_info(current_user.id)

    if not account_info:
        raise HTTPException(status_code=400, detail="Trading account not connected")

    return account_info


@router.get("/positions", response_model=List[PositionResponse], tags=["Positions"])
async def get_open_positions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get open positions

    Returns all currently open stock positions.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of open positions
    """
    manager = get_trading_manager(db)
    positions = manager.get_open_positions(current_user.id)

    if positions is None:
        raise HTTPException(status_code=400, detail="Could not retrieve positions")

    return positions


@router.get("/orders", response_model=List[TradeExecutionResponse], tags=["Orders"])
async def get_order_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get order history

    Returns recent trade executions.

    Args:
        current_user: Current authenticated user
        db: Database session
        limit: Number of orders to return (default 20)

    Returns:
        List of trade executions
    """
    manager = get_trading_manager(db)
    orders = manager.get_order_history(current_user.id, limit=limit)

    if orders is None:
        raise HTTPException(status_code=400, detail="Could not retrieve orders")

    return orders


@router.post("/buy", tags=["Orders"])
async def place_buy_order(
    request: BuyOrderRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Place a buy order

    Supports market and limit orders with optional stop loss.

    Args:
        request: Buy order details (symbol, quantity, order type, etc.)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Order confirmation with order ID
    """
    manager = get_trading_manager(db)
    success, message, trade_id = manager.execute_trade(
        user_id=current_user.id,
        symbol=request.symbol.upper(),
        quantity=request.quantity,
        side="buy",
        order_type=request.order_type,
        limit_price=request.limit_price,
        stop_loss=request.stop_loss,
        prediction_id=request.prediction_id,
        prediction_direction=request.prediction_direction,
        prediction_confidence=request.prediction_confidence,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "trade_id": trade_id,
    }


@router.post("/sell", tags=["Orders"])
async def place_sell_order(
    request: SellOrderRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Place a sell order

    Supports market and limit orders.

    Args:
        request: Sell order details (symbol, quantity, order type, etc.)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Order confirmation with order ID
    """
    manager = get_trading_manager(db)
    success, message, trade_id = manager.execute_trade(
        user_id=current_user.id,
        symbol=request.symbol.upper(),
        quantity=request.quantity,
        side="sell",
        order_type=request.order_type,
        limit_price=request.limit_price,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "trade_id": trade_id,
    }


@router.get("/stats", response_model=TradeStatsResponse, tags=["Analytics"])
async def get_trading_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get trading statistics

    Includes win rate, P&L, best/worst trades, etc.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Trading statistics
    """
    manager = get_trading_manager(db)
    stats = manager.calculate_trade_stats(current_user.id)

    if stats is None:
        raise HTTPException(status_code=500, detail="Could not calculate stats")

    return stats


@router.get("/status", tags=["Account"])
async def get_trading_status(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get trading connection status

    Returns whether trading account is connected and active.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Connection status
    """
    account = db.query(models.TradingAccount).filter(
        models.TradingAccount.user_id == current_user.id
    ).first()

    if not account:
        return {
            "is_connected": False,
            "trading_mode": None,
            "message": "No trading account connected",
        }

    return {
        "is_connected": account.is_connected,
        "trading_mode": account.trading_mode,
        "message": "Trading account connected",
    }
