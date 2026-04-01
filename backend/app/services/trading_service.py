"""
Trading service for Alpaca integration
Handles live and paper trading, order management, and P&L tracking
"""
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import alpaca_trade_api as tradeapi
from sqlalchemy.orm import Session
from .. import models
from .market_data import get_market_service

logger = logging.getLogger(__name__)


class TradingService:
    """Service for handling Alpaca trading operations"""

    def __init__(self, api_key: str, secret_key: str, base_url: str = None):
        """
        Initialize Alpaca trading API client

        Args:
            api_key: Alpaca API key
            secret_key: Alpaca secret key
            base_url: Optional base URL for paper or live trading
        """
        try:
            self.api = tradeapi.REST(
                api_key,
                secret_key,
                base_url or "https://paper-api.alpaca.markets"
            )
            self.connected = True
            logger.info("Connected to Alpaca API")
        except Exception as e:
            logger.error(f"Failed to connect to Alpaca API: {e}")
            self.connected = False
            self.api = None

    def is_connected(self) -> bool:
        """Check if connected to Alpaca API"""
        return self.connected and self.api is not None

    def get_account(self) -> Optional[Dict]:
        """
        Get account information

        Returns:
            Account details dict with balance, buying power, etc.
        """
        if not self.is_connected():
            return None
        try:
            account = self.api.get_account()
            return {
                "id": account.id,
                "balance": float(account.equity),
                "buying_power": float(account.buying_power),
                "cash": float(account.cash),
                "day_pnl": float(account.unrealized_pl),
                "day_pnl_percent": float(account.unrealized_pl_pct) * 100 if account.unrealized_pl_pct else 0.0,
                "portfolio_value": float(account.equity),
            }
        except Exception as e:
            logger.error(f"Error getting account: {e}")
            return None

    def get_positions(self) -> Optional[List[Dict]]:
        """
        Get all open positions

        Returns:
            List of position dicts with symbol, qty, entry price, current price, etc.
        """
        if not self.is_connected():
            return None
        try:
            positions = self.api.list_positions()
            result = []
            for pos in positions:
                result.append({
                    "symbol": pos.symbol,
                    "quantity": float(pos.qty),
                    "entry_price": float(pos.avg_fill_price),
                    "current_price": float(pos.current_price),
                    "market_value": float(pos.market_value),
                    "unrealized_pl": float(pos.unrealized_pl),
                    "unrealized_pl_pct": float(pos.unrealized_plpc) * 100 if pos.unrealized_plpc else 0.0,
                    "side": pos.side,
                })
            return result
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return None

    def get_orders(self, status: str = "all") -> Optional[List[Dict]]:
        """
        Get order history

        Args:
            status: "all", "open", "closed", "cancelled"

        Returns:
            List of order dicts
        """
        if not self.is_connected():
            return None
        try:
            orders = self.api.list_orders(status=status)
            result = []
            for order in orders:
                result.append({
                    "id": order.id,
                    "symbol": order.symbol,
                    "side": order.side,
                    "quantity": float(order.qty),
                    "filled_quantity": float(order.filled_qty),
                    "price": float(order.limit_price) if order.limit_price else float(order.filled_avg_price) if order.filled_avg_price else 0.0,
                    "filled_price": float(order.filled_avg_price) if order.filled_avg_price else None,
                    "status": order.status,
                    "type": order.order_type,
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                })
            return result
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            return None

    def place_order(
        self,
        symbol: str,
        quantity: float,
        side: str,
        order_type: str = "market",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Optional[Dict]:
        """
        Place an order

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            side: "buy" or "sell"
            order_type: "market" or "limit"
            limit_price: Price for limit orders
            stop_price: Stop loss price

        Returns:
            Order details dict or None if failed
        """
        if not self.is_connected():
            return None

        try:
            # Build order kwargs
            order_kwargs = {
                "symbol": symbol,
                "qty": quantity,
                "side": side,
                "type": order_type,
                "time_in_force": "day",
            }

            if order_type == "limit" and limit_price:
                order_kwargs["limit_price"] = limit_price

            if stop_price:
                order_kwargs["stop_price"] = stop_price

            order = self.api.submit_order(**order_kwargs)

            result = {
                "id": order.id,
                "symbol": order.symbol,
                "side": order.side,
                "quantity": float(order.qty),
                "filled_quantity": float(order.filled_qty),
                "price": float(order.limit_price) if order.limit_price else 0.0,
                "status": order.status,
                "type": order.order_type,
                "created_at": order.created_at,
            }
            logger.info(f"Order placed: {symbol} {side} {quantity} @ {limit_price or 'market'}")
            return result
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return None

    def place_buy_order(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "market",
        limit_price: Optional[float] = None,
        stop_loss: Optional[float] = None,
    ) -> Optional[Dict]:
        """
        Place a buy order

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            order_type: "market" or "limit"
            limit_price: Limit price for limit orders
            stop_loss: Stop loss price for risk management

        Returns:
            Order details or None
        """
        return self.place_order(
            symbol=symbol,
            quantity=quantity,
            side="buy",
            order_type=order_type,
            limit_price=limit_price,
            stop_price=stop_loss,
        )

    def place_sell_order(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "market",
        limit_price: Optional[float] = None,
    ) -> Optional[Dict]:
        """
        Place a sell order

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            order_type: "market" or "limit"
            limit_price: Limit price for limit orders

        Returns:
            Order details or None
        """
        return self.place_order(
            symbol=symbol,
            quantity=quantity,
            side="sell",
            order_type=order_type,
            limit_price=limit_price,
        )

    def cancel_order(self, order_id: str) -> bool:
        """
        Cancel an order

        Args:
            order_id: Alpaca order ID

        Returns:
            True if successful, False otherwise
        """
        if not self.is_connected():
            return False

        try:
            self.api.cancel_order(order_id)
            logger.info(f"Order cancelled: {order_id}")
            return True
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            return False

    def get_order_status(self, order_id: str) -> Optional[Dict]:
        """
        Get order status

        Args:
            order_id: Alpaca order ID

        Returns:
            Order details or None
        """
        if not self.is_connected():
            return None

        try:
            order = self.api.get_order(order_id)
            return {
                "id": order.id,
                "symbol": order.symbol,
                "side": order.side,
                "quantity": float(order.qty),
                "filled_quantity": float(order.filled_qty),
                "price": float(order.limit_price) if order.limit_price else float(order.filled_avg_price) if order.filled_avg_price else 0.0,
                "filled_price": float(order.filled_avg_price) if order.filled_avg_price else None,
                "status": order.status,
                "type": order.order_type,
                "created_at": order.created_at,
                "updated_at": order.updated_at,
            }
        except Exception as e:
            logger.error(f"Error getting order status: {e}")
            return None

    def validate_order(
        self,
        symbol: str,
        quantity: float,
        side: str,
        price: float,
        account_balance: float,
        max_loss_per_trade: float = 500.0,
    ) -> Tuple[bool, str]:
        """
        Validate order before placement

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            side: "buy" or "sell"
            price: Order price
            account_balance: Current account balance
            max_loss_per_trade: Maximum loss allowed per trade

        Returns:
            (is_valid, error_message)
        """
        # Validate symbol
        if not symbol or len(symbol) > 5:
            return False, "Invalid symbol"

        # Validate quantity
        if quantity <= 0:
            return False, "Quantity must be positive"

        if quantity > 100000:
            return False, "Quantity exceeds maximum"

        # Validate price
        if price <= 0:
            return False, "Price must be positive"

        # Check buying power for buy orders
        if side == "buy":
            required_capital = quantity * price
            if required_capital > account_balance * 0.95:  # Keep 5% buffer
                return False, f"Insufficient buying power. Need ${required_capital:.2f}, have ${account_balance:.2f}"

        # Check max loss per trade
        if side == "buy":
            potential_loss = quantity * (price * 0.02)  # 2% default loss
            if potential_loss > max_loss_per_trade:
                return False, f"Trade loss (${potential_loss:.2f}) exceeds max allowed (${max_loss_per_trade:.2f})"

        return True, ""


class TradingManager:
    """Manages trading operations with database persistence"""

    def __init__(self, db: Session):
        """Initialize trading manager with database session"""
        self.db = db

    def connect_account(
        self,
        user_id: int,
        api_key: str,
        secret_key: str,
        trading_mode: str = "paper",
    ) -> Tuple[bool, str]:
        """
        Connect trading account for user

        Args:
            user_id: User ID
            api_key: Alpaca API key
            secret_key: Alpaca secret key
            trading_mode: "paper" or "live"

        Returns:
            (success, message)
        """
        try:
            # Check if account already exists
            account = self.db.query(models.TradingAccount).filter(
                models.TradingAccount.user_id == user_id
            ).first()

            # Initialize trading service to test connection
            base_url = "https://api.alpaca.markets" if trading_mode == "live" else "https://paper-api.alpaca.markets"
            service = TradingService(api_key, secret_key, base_url)

            if not service.is_connected():
                return False, "Failed to connect to Alpaca API. Check credentials."

            # Get account info
            account_info = service.get_account()
            if not account_info:
                return False, "Could not retrieve account information"

            if account:
                # Update existing account
                account.alpaca_api_key = api_key
                account.alpaca_secret_key = secret_key
                account.is_connected = True
                account.trading_mode = trading_mode
                account.account_balance = account_info["balance"]
                account.buying_power = account_info["buying_power"]
                account.last_synced = datetime.utcnow()
            else:
                # Create new account
                account = models.TradingAccount(
                    user_id=user_id,
                    alpaca_api_key=api_key,
                    alpaca_secret_key=secret_key,
                    is_connected=True,
                    trading_mode=trading_mode,
                    account_balance=account_info["balance"],
                    buying_power=account_info["buying_power"],
                    last_synced=datetime.utcnow(),
                )
                self.db.add(account)

            self.db.commit()
            return True, f"Connected to Alpaca {trading_mode} trading"

        except Exception as e:
            logger.error(f"Error connecting account: {e}")
            return False, f"Error: {str(e)}"

    def disconnect_account(self, user_id: int) -> bool:
        """
        Disconnect trading account

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        try:
            account = self.db.query(models.TradingAccount).filter(
                models.TradingAccount.user_id == user_id
            ).first()

            if account:
                account.is_connected = False
                self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error disconnecting account: {e}")
            return False

    def get_account_info(self, user_id: int) -> Optional[Dict]:
        """
        Get account information with current sync

        Args:
            user_id: User ID

        Returns:
            Account info dict or None
        """
        try:
            account = self.db.query(models.TradingAccount).filter(
                models.TradingAccount.user_id == user_id
            ).first()

            if not account or not account.is_connected:
                return None

            # Refresh account info from Alpaca
            base_url = "https://api.alpaca.markets" if account.trading_mode == "live" else "https://paper-api.alpaca.markets"
            service = TradingService(account.alpaca_api_key, account.alpaca_secret_key, base_url)

            if not service.is_connected():
                return None

            account_info = service.get_account()
            if account_info:
                # Update cached values
                account.account_balance = account_info["balance"]
                account.buying_power = account_info["buying_power"]
                account.day_pnl = account_info["day_pnl"]
                account.day_pnl_percent = account_info["day_pnl_percent"]
                account.last_synced = datetime.utcnow()
                self.db.commit()

                return {
                    "account_balance": account.account_balance,
                    "buying_power": account.buying_power,
                    "day_pnl": account.day_pnl,
                    "day_pnl_percent": account.day_pnl_percent,
                    "trading_mode": account.trading_mode,
                    "is_connected": account.is_connected,
                    "last_synced": account.last_synced,
                }

            return None
        except Exception as e:
            logger.error(f"Error getting account info: {e}")
            return None

    def execute_trade(
        self,
        user_id: int,
        symbol: str,
        quantity: float,
        side: str,
        order_type: str = "market",
        limit_price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        prediction_id: Optional[int] = None,
        prediction_direction: Optional[str] = None,
        prediction_confidence: Optional[float] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Execute a trade and record it

        Args:
            user_id: User ID
            symbol: Stock symbol
            quantity: Number of shares
            side: "buy" or "sell"
            order_type: "market" or "limit"
            limit_price: Limit price if limit order
            stop_loss: Stop loss price
            prediction_id: Optional prediction ID
            prediction_direction: Optional prediction direction
            prediction_confidence: Optional prediction confidence

        Returns:
            (success, message, trade_id)
        """
        try:
            account = self.db.query(models.TradingAccount).filter(
                models.TradingAccount.user_id == user_id
            ).first()

            if not account or not account.is_connected:
                return False, "Trading account not connected", None

            # Get trading service
            base_url = "https://api.alpaca.markets" if account.trading_mode == "live" else "https://paper-api.alpaca.markets"
            service = TradingService(account.alpaca_api_key, account.alpaca_secret_key, base_url)

            if not service.is_connected():
                return False, "Failed to connect to Alpaca", None

            # Validate order
            is_valid, error_msg = service.validate_order(
                symbol=symbol,
                quantity=quantity,
                side=side,
                price=limit_price or 100.0,  # Estimate if market order
                account_balance=account.buying_power,
                max_loss_per_trade=account.max_loss_per_trade,
            )

            if not is_valid:
                return False, error_msg, None

            # Place order
            order = service.place_order(
                symbol=symbol,
                quantity=quantity,
                side=side,
                order_type=order_type,
                limit_price=limit_price,
                stop_price=stop_loss,
            )

            if not order:
                return False, "Failed to place order", None

            # Record trade execution
            trade = models.TradeExecution(
                trading_account_id=account.id,
                alpaca_order_id=order["id"],
                symbol=symbol,
                side=side,
                order_type=order_type,
                quantity=quantity,
                price=limit_price or 0.0,
                status=order["status"],
                stop_loss=stop_loss,
                prediction_id=prediction_id,
                prediction_direction=prediction_direction,
                prediction_confidence=prediction_confidence,
                executed_at=datetime.utcnow(),
            )

            self.db.add(trade)
            self.db.commit()

            return True, f"Order placed: {symbol} {side} {quantity}", trade.id

        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            return False, f"Error: {str(e)}", None

    def get_open_positions(self, user_id: int) -> Optional[List[Dict]]:
        """
        Get open positions for user

        Args:
            user_id: User ID

        Returns:
            List of positions or None
        """
        try:
            account = self.db.query(models.TradingAccount).filter(
                models.TradingAccount.user_id == user_id
            ).first()

            if not account or not account.is_connected:
                return None

            base_url = "https://api.alpaca.markets" if account.trading_mode == "live" else "https://paper-api.alpaca.markets"
            service = TradingService(account.alpaca_api_key, account.alpaca_secret_key, base_url)

            if not service.is_connected():
                return None

            return service.get_positions()

        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return None

    def get_order_history(self, user_id: int, limit: int = 20) -> Optional[List[Dict]]:
        """
        Get order history for user

        Args:
            user_id: User ID
            limit: Number of orders to return

        Returns:
            List of orders or None
        """
        try:
            trades = self.db.query(models.TradeExecution).join(
                models.TradingAccount
            ).filter(
                models.TradingAccount.user_id == user_id
            ).order_by(
                models.TradeExecution.created_at.desc()
            ).limit(limit).all()

            result = []
            for trade in trades:
                result.append({
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "quantity": trade.quantity,
                    "filled_quantity": trade.filled_quantity,
                    "price": trade.price,
                    "filled_price": trade.filled_price,
                    "status": trade.status,
                    "order_type": trade.order_type,
                    "pnl": trade.realized_pnl,
                    "pnl_percent": trade.realized_pnl_percent,
                    "prediction_direction": trade.prediction_direction,
                    "prediction_confidence": trade.prediction_confidence,
                    "prediction_accuracy": trade.prediction_accuracy,
                    "created_at": trade.created_at,
                    "executed_at": trade.executed_at,
                })

            return result

        except Exception as e:
            logger.error(f"Error getting order history: {e}")
            return None

    def calculate_trade_stats(self, user_id: int) -> Optional[Dict]:
        """
        Calculate trading statistics for user

        Args:
            user_id: User ID

        Returns:
            Stats dict with win rate, total P&L, etc.
        """
        try:
            trades = self.db.query(models.TradeExecution).join(
                models.TradingAccount
            ).filter(
                models.TradingAccount.user_id == user_id,
                models.TradeExecution.status == "filled",
                models.TradeExecution.realized_pnl.isnot(None),
            ).all()

            if not trades:
                return {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "win_rate": 0.0,
                    "total_pnl": 0.0,
                    "avg_pnl": 0.0,
                    "best_trade": 0.0,
                    "worst_trade": 0.0,
                }

            winning_trades = [t for t in trades if t.realized_pnl and t.realized_pnl > 0]
            losing_trades = [t for t in trades if t.realized_pnl and t.realized_pnl < 0]
            total_pnl = sum(t.realized_pnl for t in trades if t.realized_pnl)

            return {
                "total_trades": len(trades),
                "winning_trades": len(winning_trades),
                "losing_trades": len(losing_trades),
                "win_rate": (len(winning_trades) / len(trades) * 100) if trades else 0.0,
                "total_pnl": total_pnl,
                "avg_pnl": total_pnl / len(trades) if trades else 0.0,
                "best_trade": max((t.realized_pnl for t in trades if t.realized_pnl), default=0.0),
                "worst_trade": min((t.realized_pnl for t in trades if t.realized_pnl), default=0.0),
            }

        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            return None


def get_trading_manager(db: Session) -> TradingManager:
    """Dependency for getting trading manager"""
    return TradingManager(db)
