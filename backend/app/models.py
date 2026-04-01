"""
SQLAlchemy database models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class AlertType(str, enum.Enum):
    """Types of price alerts"""
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"


class AssetType(str, enum.Enum):
    """Types of assets"""
    STOCK = "stock"
    CRYPTO = "crypto"


class PlanTier(str, enum.Enum):
    """Subscription plan tiers"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    PAUSED = "paused"


class PaymentStatus(str, enum.Enum):
    """Payment status"""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone_number = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    portfolios = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="owner", cascade="all, delete-orphan")
    watchlist = relationship("WatchlistItem", backref="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", backref="user", cascade="all, delete-orphan")
    goals = relationship("Goal", backref="user", cascade="all, delete-orphan")
    dividends = relationship("Dividend", backref="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", backref="user", cascade="all, delete-orphan", uselist=False)
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    usage = relationship("Usage", back_populates="user", cascade="all, delete-orphan")


class Portfolio(Base):
    """User portfolio model"""
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="Main Portfolio")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    """Individual asset holding in a portfolio"""
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255))
    asset_type = Column(Enum(AssetType), nullable=False)
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(String(500))
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Composite indexes for efficient lookups
    __table_args__ = (
        Index('ix_portfolio_symbol', 'portfolio_id', 'symbol'),
    )

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class Alert(Base):
    """Price alert model"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    asset_type = Column(Enum(AssetType), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    target_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    is_triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime(timezone=True))

    # Notification preferences
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    frequency = Column(String(20), default="immediately")  # immediately, daily, weekly, never

    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite indexes for efficient lookups
    __table_args__ = (
        Index('ix_user_symbol_alert', 'user_id', 'symbol'),
        Index('ix_user_active_alert', 'user_id', 'is_active'),
    )

    # Relationships
    owner = relationship("User", back_populates="alerts")


class WatchlistItem(Base):
    """User watchlist item"""
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    asset_type = Column(Enum(AssetType), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite index for efficient user watchlist lookups
    __table_args__ = (
        Index('ix_user_symbol_watchlist', 'user_id', 'symbol'),
    )


class Transaction(Base):
    """Transaction history for buy/sell operations"""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255))
    asset_type = Column(Enum(AssetType), nullable=False)
    transaction_type = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(String(500))
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite indexes for efficient lookups
    __table_args__ = (
        Index('ix_user_portfolio_tx', 'user_id', 'portfolio_id'),
        Index('ix_portfolio_date_tx', 'portfolio_id', 'transaction_date'),
    )


class Goal(Base):
    """Financial goals tracker"""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    deadline = Column(DateTime(timezone=True))
    is_completed = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Dividend(Base):
    """Dividend tracking"""
    __tablename__ = "dividends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    amount_per_share = Column(Float, nullable=False)
    shares_held = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite index for efficient user dividend lookups
    __table_args__ = (
        Index('ix_user_symbol_dividend', 'user_id', 'symbol'),
    )


class UserPreference(Base):
    """User preferences for theme, currency, etc."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    theme = Column(String(20), default="dark")
    currency = Column(String(10), default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserStats(Base):
    """User statistics for leaderboard ranking"""
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Prediction accuracy metrics
    accuracy_percentage = Column(Float, default=0.0)
    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)

    # Trading metrics
    best_trade_return = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)

    # Rankings
    rank_monthly = Column(Integer)
    rank_yearly = Column(Integer)
    rank_all_time = Column(Integer)

    # Timestamps
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="stats")

    # Composite indexes for ranking queries
    __table_args__ = (
        Index('ix_user_accuracy', 'accuracy_percentage'),
        Index('ix_user_rank_monthly', 'rank_monthly'),
        Index('ix_user_rank_yearly', 'rank_yearly'),
    )


class Badge(Base):
    """Badge definitions for achievements"""
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    criteria = Column(String(500), nullable=False)  # JSON describing how to earn
    icon_url = Column(String(500))
    rarity = Column(String(20), default="common")  # common, uncommon, rare, epic, legendary
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user_badges = relationship("UserBadge", back_populates="badge", cascade="all, delete-orphan")


class UserBadge(Base):
    """User badges earned"""
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="earned_badges")
    badge = relationship("Badge", back_populates="user_badges")

    # Composite index for efficient lookups
    __table_args__ = (
        Index('ix_user_badge', 'user_id', 'badge_id'),
    )


class UserFollow(Base):
    """User following relationships"""
    __tablename__ = "user_follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite index for efficient lookups
    __table_args__ = (
        Index('ix_follower_following', 'follower_id', 'following_id'),
    )


class Backtest(Base):
    """Backtest results and metadata"""
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    asset_type = Column(Enum(AssetType), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    strategy = Column(String(50), nullable=False, default="buy_and_hold")

    # Performance metrics
    total_return_percent = Column(Float, nullable=False)
    annual_return_percent = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=False)
    max_drawdown_percent = Column(Float, nullable=False)
    win_rate_percent = Column(Float, nullable=False)
    total_trades = Column(Integer, default=0)

    # Benchmark comparison
    benchmark_symbol = Column(String(20), default="SPY")
    benchmark_return_percent = Column(Float, nullable=True)
    outperformance_percent = Column(Float, nullable=True)

    # Results data (JSON)
    equity_curve = Column(String, nullable=True)  # JSON array
    trades = Column(String, nullable=True)  # JSON array
    monthly_returns = Column(String, nullable=True)  # JSON object
    monte_carlo_stats = Column(String, nullable=True)  # JSON object

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('ix_user_symbol_backtest', 'user_id', 'symbol'),
    )


class HistoricalPrice(Base):
    """Cached historical price data"""
    __tablename__ = "historical_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    asset_type = Column(Enum(AssetType), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('ix_symbol_date', 'symbol', 'date'),
    )


class OrderSide(str, enum.Enum):
    """Order side - buy or sell"""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, enum.Enum):
    """Order type - market or limit"""
    MARKET = "market"
    LIMIT = "limit"


class OrderStatus(str, enum.Enum):
    """Order status"""
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class TradingMode(str, enum.Enum):
    """Trading mode - paper or live"""
    PAPER = "paper"
    LIVE = "live"


class TradingAccount(Base):
    """User's trading account (Alpaca integration)"""
    __tablename__ = "trading_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    alpaca_api_key = Column(String(255), nullable=False)
    alpaca_secret_key = Column(String(255), nullable=False)
    is_connected = Column(Boolean, default=False)
    trading_mode = Column(Enum(TradingMode), default=TradingMode.PAPER)
    account_balance = Column(Float, default=0.0)
    buying_power = Column(Float, default=0.0)
    day_pnl = Column(Float, default=0.0)
    day_pnl_percent = Column(Float, default=0.0)
    last_synced = Column(DateTime(timezone=True), nullable=True)
    max_loss_per_trade = Column(Float, default=500.0)  # Max loss per trade in USD
    auto_stop_loss_percent = Column(Float, default=2.0)  # Auto stop loss as percentage
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="trading_account")
    trade_executions = relationship("TradeExecution", back_populates="account", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_user_trading', 'user_id'),
    )


class TradeExecution(Base):
    """Individual trade execution record"""
    __tablename__ = "trade_executions"

    id = Column(Integer, primary_key=True, index=True)
    trading_account_id = Column(Integer, ForeignKey("trading_accounts.id", ondelete="CASCADE"), nullable=False)
    alpaca_order_id = Column(String(100), nullable=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    side = Column(Enum(OrderSide), nullable=False)
    order_type = Column(Enum(OrderType), nullable=False)
    quantity = Column(Float, nullable=False)
    filled_quantity = Column(Float, default=0.0)
    price = Column(Float, nullable=False)  # Requested price
    filled_price = Column(Float, nullable=True)  # Actual filled price
    total_cost = Column(Float, nullable=True)  # Actual cost (filled_quantity * filled_price)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    commission = Column(Float, default=0.0)  # Trading commission

    # Prediction-related fields
    prediction_id = Column(Integer, nullable=True)  # Link to prediction that triggered trade
    prediction_direction = Column(String(20), nullable=True)  # "up" or "down"
    prediction_confidence = Column(Float, nullable=True)  # Prediction confidence 0-100
    prediction_accuracy = Column(Boolean, nullable=True)  # Was prediction correct?

    # P&L tracking
    entry_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    realized_pnl = Column(Float, nullable=True)
    realized_pnl_percent = Column(Float, nullable=True)

    # Risk management
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)

    executed_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    account = relationship("TradingAccount", back_populates="trade_executions")

    __table_args__ = (
        Index('ix_account_symbol', 'trading_account_id', 'symbol'),
        Index('ix_account_date', 'trading_account_id', 'created_at'),
        Index('ix_alpaca_order', 'alpaca_order_id'),
    )


class Subscription(Base):
    """User subscription model"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    plan = Column(Enum(PlanTier), nullable=False, default=PlanTier.FREE, index=True)
    status = Column(Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE, index=True)

    # Stripe integration
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_price_id = Column(String(255), nullable=True)

    # Billing period
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    # Billing info
    is_annual = Column(Boolean, default=False)  # Annual vs monthly billing
    amount_cents = Column(Integer, default=0)  # Amount in cents for tracking

    # Metadata
    cancellation_reason = Column(String(500), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscription")

    __table_args__ = (
        Index('ix_user_plan', 'user_id', 'plan'),
        Index('ix_stripe_customer', 'stripe_customer_id'),
    )


class Payment(Base):
    """Payment transaction records"""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Stripe integration
    stripe_payment_intent_id = Column(String(255), nullable=True, unique=True)
    stripe_invoice_id = Column(String(255), nullable=True, unique=True, index=True)

    # Payment details
    amount_cents = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="USD")
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)

    # Payment method
    payment_method = Column(String(50), default="card")  # card, etc.
    card_last_four = Column(String(4), nullable=True)
    card_brand = Column(String(50), nullable=True)

    # Invoice details
    receipt_url = Column(String(500), nullable=True)
    invoice_number = Column(String(100), nullable=True, unique=True)

    # Description
    description = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="payments")

    __table_args__ = (
        Index('ix_user_payment_date', 'user_id', 'created_at'),
        Index('ix_stripe_invoice', 'stripe_invoice_id'),
    )


class Usage(Base):
    """Monthly usage tracking for plan limits"""
    __tablename__ = "usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Month tracking
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12

    # Usage counters
    alerts_sent = Column(Integer, default=0)
    alerts_limit = Column(Integer, default=10)  # Per day, aggregated for month

    predictions_made = Column(Integer, default=0)
    predictions_limit = Column(Integer, default=0)  # 0 = unlimited

    api_calls = Column(Integer, default=0)
    api_calls_limit = Column(Integer, default=0)  # 0 = unlimited

    watchlists_created = Column(Integer, default=0)
    watchlists_limit = Column(Integer, default=5)

    backtests_run = Column(Integer, default=0)
    backtests_limit = Column(Integer, default=0)  # 0 = unlimited

    sms_sent = Column(Integer, default=0)
    sms_limit = Column(Integer, default=0)  # 0 = unlimited

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="usage")

    __table_args__ = (
        Index('ix_user_month', 'user_id', 'year', 'month'),
    )


class PricingTier(str, enum.Enum):
    """API pricing tiers"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class APIKey(Base):
    """API Key for Developer API access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # User-friendly name
    api_key = Column(String(255), unique=True, nullable=False, index=True)  # Public key
    api_secret = Column(String(255), nullable=False)  # Secret key (hashed)
    pricing_tier = Column(Enum(PricingTier), default=PricingTier.FREE)
    rate_limit_per_minute = Column(Integer, default=100)  # Rate limit: calls per minute
    is_active = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    webhook_url = Column(String(500), nullable=True)  # Webhook endpoint for alerts
    webhook_secret = Column(String(255), nullable=True)  # Secret for webhook signing

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    rotated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="api_keys")
    usage_records = relationship("APIUsage", back_populates="api_key", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_user_api_key', 'user_id', 'is_active'),
        Index('ix_api_key', 'api_key'),
    )


class APIUsage(Base):
    """Track API usage for billing and rate limiting"""
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    calls_made = Column(Integer, default=0)
    overage_calls = Column(Integer, default=0)
    cost = Column(Float, default=0.0)  # Cost for overages only

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    api_key = relationship("APIKey", back_populates="usage_records")

    __table_args__ = (
        Index('ix_api_key_month', 'api_key_id', 'year', 'month'),
    )


class APILog(Base):
    """Log individual API requests for debugging and analytics"""
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)  # GET, POST, etc
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    error_message = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_api_key_date', 'api_key_id', 'created_at'),
    )
