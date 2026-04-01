"""
SQLAlchemy database models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Index
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
