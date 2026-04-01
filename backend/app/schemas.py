"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from enum import Enum

# Generic type for pagination
T = TypeVar('T')


# ============== Enums ==============

class AssetType(str, Enum):
    STOCK = "stock"
    CRYPTO = "crypto"


class AlertType(str, Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"


# ============== Pagination ==============

class PaginationParams(BaseModel):
    """Pagination parameters"""
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper"""
    total: int
    limit: int
    offset: int
    items: List[T]


# ============== Auth Schemas ==============

class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT Token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token data"""
    user_id: Optional[int] = None


# ============== Portfolio Schemas ==============

class PortfolioCreate(BaseModel):
    """Schema for creating a portfolio"""
    name: str = Field(default="Main Portfolio", max_length=100)


class PortfolioResponse(BaseModel):
    """Schema for portfolio response"""
    id: int
    name: str
    created_at: datetime
    total_value: Optional[float] = None
    total_gain_loss: Optional[float] = None
    total_gain_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Holding Schemas ==============

class HoldingCreate(BaseModel):
    """Schema for adding a holding"""
    symbol: str = Field(..., max_length=20)
    name: Optional[str] = None
    asset_type: AssetType
    quantity: float = Field(..., gt=0)
    buy_price: float = Field(..., gt=0)
    buy_date: datetime
    notes: Optional[str] = Field(None, max_length=500)


class HoldingUpdate(BaseModel):
    """Schema for updating a holding"""
    quantity: Optional[float] = Field(None, gt=0)
    buy_price: Optional[float] = Field(None, gt=0)
    buy_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class HoldingResponse(BaseModel):
    """Schema for holding response with current data"""
    id: int
    symbol: str
    name: Optional[str]
    asset_type: AssetType
    quantity: float
    buy_price: float
    buy_date: datetime
    notes: Optional[str]
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Market Data Schemas ==============

class QuoteResponse(BaseModel):
    """Schema for price quote response"""
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    asset_type: AssetType


class GainerResponse(BaseModel):
    """Schema for top gainer/loser"""
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    asset_type: AssetType


class MarketOverview(BaseModel):
    """Schema for market overview data"""
    sp500: Optional[QuoteResponse] = None
    nasdaq: Optional[QuoteResponse] = None
    btc: Optional[QuoteResponse] = None
    eth: Optional[QuoteResponse] = None
    top_stock_gainers: List[GainerResponse] = []
    top_crypto_gainers: List[GainerResponse] = []


# ============== Alert Schemas ==============

class AlertCreate(BaseModel):
    """Schema for creating an alert"""
    symbol: str = Field(..., max_length=20)
    asset_type: AssetType
    alert_type: AlertType
    target_value: float
    notify_email: bool = True
    notify_sms: bool = False
    frequency: str = Field(default="immediately", pattern="^(immediately|daily|weekly|never)$")


class AlertUpdate(BaseModel):
    """Schema for updating an alert"""
    target_value: Optional[float] = None
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None
    frequency: Optional[str] = Field(None, pattern="^(immediately|daily|weekly|never)$")
    is_active: Optional[bool] = None


class AlertResponse(BaseModel):
    """Schema for alert response"""
    id: int
    symbol: str
    asset_type: AssetType
    alert_type: AlertType
    target_value: float
    is_active: bool
    is_triggered: bool
    triggered_at: Optional[datetime]
    notify_email: bool
    notify_sms: bool
    frequency: str
    created_at: datetime
    current_price: Optional[float] = None

    class Config:
        from_attributes = True


# ============== Performance Schemas ==============

class PerformanceData(BaseModel):
    """Schema for portfolio performance data"""
    date: datetime
    value: float


class PortfolioPerformance(BaseModel):
    """Schema for detailed portfolio performance"""
    total_invested: float
    current_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    best_performer: Optional[HoldingResponse] = None
    worst_performer: Optional[HoldingResponse] = None
    allocation: dict  # symbol -> percentage
    history: List[PerformanceData] = []


# ============== Watchlist Schemas ==============

class WatchlistCreate(BaseModel):
    symbol: str = Field(..., max_length=20)
    asset_type: AssetType

class WatchlistResponse(BaseModel):
    id: int
    symbol: str
    asset_type: AssetType
    added_at: datetime
    current_price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    name: Optional[str] = None

    class Config:
        from_attributes = True


# ============== Transaction Schemas ==============

class TransactionCreate(BaseModel):
    portfolio_id: int
    symbol: str = Field(..., max_length=20)
    name: Optional[str] = None
    asset_type: AssetType
    transaction_type: str = Field(..., pattern="^(buy|sell)$")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)
    transaction_date: datetime

class TransactionResponse(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    name: Optional[str]
    asset_type: AssetType
    transaction_type: str
    quantity: float
    price: float
    total_amount: float
    notes: Optional[str]
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Goal Schemas ==============

class GoalCreate(BaseModel):
    name: str = Field(..., max_length=200)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: Optional[datetime] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[datetime] = None
    is_completed: Optional[bool] = None

class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    deadline: Optional[datetime]
    is_completed: bool
    progress_percent: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Dividend Schemas ==============

class DividendCreate(BaseModel):
    symbol: str = Field(..., max_length=20)
    amount_per_share: float = Field(..., gt=0)
    shares_held: float = Field(..., gt=0)
    payment_date: datetime

class DividendResponse(BaseModel):
    id: int
    symbol: str
    amount_per_share: float
    shares_held: float
    total_amount: float
    payment_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============== User Preferences Schemas ==============

class PreferencesUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(dark|light)$")
    currency: Optional[str] = Field(None, max_length=10)

class PreferencesResponse(BaseModel):
    theme: str
    currency: str

    class Config:
        from_attributes = True


# ============== Advanced Analytics Schemas ==============

class AdvancedAnalytics(BaseModel):
    sharpe_ratio: Optional[float] = None
    volatility: Optional[float] = None
    beta: Optional[float] = None
    max_drawdown: Optional[float] = None
    cagr: Optional[float] = None
    total_return: Optional[float] = None

class CorrelationData(BaseModel):
    symbols: List[str]
    matrix: List[List[float]]

class PnLCalendarEntry(BaseModel):
    date: str
    pnl: float

class SectorAllocation(BaseModel):
    sector: str
    percentage: float
    value: float


# ============== News Schemas ==============

class NewsArticle(BaseModel):
    title: str
    description: Optional[str] = None
    url: str
    source: Optional[str] = None
    published_at: Optional[str] = None
    image_url: Optional[str] = None


# ============== AI Prediction Schemas ==============

class PredictionResponse(BaseModel):
    symbol: str
    signal: str
    confidence: float
    reasons: List[str]
    current_price: float
    predicted_direction: str


# ============== Currency Converter Schemas ==============

class CurrencyConversion(BaseModel):
    from_currency: str
    to_currency: str
    amount: float
    result: float
    rate: float


# ============== Leaderboard Schemas ==============

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_return_percent: float
    portfolio_value: float


# ============== Share Portfolio Schemas ==============

class ShareResponse(BaseModel):
    share_id: str
    url: str
    expires_at: Optional[datetime] = None

class SharedPortfolioData(BaseModel):
    portfolio_name: str
    total_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    holdings_count: int
    top_holdings: List[dict]
    created_at: str


# ============== Backtest Schemas ==============

class BacktestRequest(BaseModel):
    """Request schema for starting a backtest"""
    symbol: str = Field(..., max_length=20)
    asset_type: AssetType
    start_date: datetime
    end_date: datetime
    strategy: str = Field(default="buy_and_hold", pattern="^(buy_and_hold|sma_crossover)$")


class TradeData(BaseModel):
    """Individual trade data"""
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    return_percent: float
    duration_days: int


class MonteCarlStats(BaseModel):
    """Monte Carlo simulation statistics"""
    worst_case: float
    median: float
    best_case: float
    std_dev: float


class BacktestResponse(BaseModel):
    """Response schema for backtest results"""
    id: int
    symbol: str
    asset_type: AssetType
    strategy: str
    start_date: datetime
    end_date: datetime
    total_return_percent: float
    annual_return_percent: float
    sharpe_ratio: float
    max_drawdown_percent: float
    win_rate_percent: float
    total_trades: int
    benchmark_return_percent: Optional[float] = None
    outperformance_percent: Optional[float] = None
    equity_curve: List[float] = []
    trades: List[TradeData] = []
    monthly_returns: Optional[dict] = None
    monte_carlo_stats: Optional[MonteCarlStats] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BacktestSummary(BaseModel):
    """Summary of a backtest for list views"""
    id: int
    symbol: str
    asset_type: AssetType
    strategy: str
    start_date: datetime
    end_date: datetime
    total_return_percent: float
    sharpe_ratio: float
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Leaderboard Schemas ==============

class BadgeResponse(BaseModel):
    """Schema for badge response"""
    id: int
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    rarity: str
    earned_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserStatsResponse(BaseModel):
    """Schema for user statistics"""
    accuracy_percentage: float
    total_predictions: int
    correct_predictions: int
    best_trade_return: float
    total_trades: int
    win_rate: float


class LeaderboardEntryResponse(BaseModel):
    """Schema for leaderboard entry"""
    rank: Optional[int]
    user_id: int
    username: str
    accuracy_percentage: float
    total_predictions: int
    correct_predictions: int
    best_trade_return: float
    total_trades: int
    win_rate: float


class UserRankResponse(BaseModel):
    """Schema for user rank"""
    user_id: int
    username: str
    rank: Optional[int]
    accuracy_percentage: float
    total_predictions: int
    correct_predictions: int
    best_trade_return: float
    total_trades: int
    win_rate: float


class UserProfileResponse(BaseModel):
    """Schema for user profile"""
    user_id: int
    username: str
    full_name: Optional[str]
    created_at: Optional[datetime]
    stats: UserStatsResponse
    badges: List[BadgeResponse]
    followers_count: int
    is_following: bool

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    """Schema for leaderboard list"""
    period: str
    data: List[LeaderboardEntryResponse]
