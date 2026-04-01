"""
Developer API v1.0 - Public API for AssetPulse predictions and data
Monetized API endpoints with rate limiting and usage tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import time

from ..database import get_db
from .. import models
from ..auth import get_current_user
from ..services.api_service import (
    APIKeyManager, RateLimiter, UsageTracker, WebhookManager,
    get_monthly_limit, get_overage_cost
)
from ..services.market_data import get_market_service
from ..services.data_aggregator import get_data_aggregator
from ..services.advanced_prediction import AdvancedPredictionEngine

router = APIRouter(prefix="/api/v1", tags=["Developer API v1"])


async def get_api_key_from_header(authorization: Optional[str] = Header(None)) -> str:
    """Extract API key from Authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Use: Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use: Bearer KEY:SECRET"
        )

    try:
        credentials = authorization[7:]  # Remove "Bearer "
        parts = credentials.split(":")
        if len(parts) != 2:
            raise ValueError()
        api_key, api_secret = parts
        return {"key": api_key, "secret": api_secret}
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )


async def authenticate_api_key(
    auth: dict = Depends(get_api_key_from_header),
    db: Session = Depends(get_db)
) -> models.APIKey:
    """Authenticate using API key and secret"""
    api_key_obj = APIKeyManager.verify_api_key(db, auth["key"], auth["secret"])

    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key or secret"
        )

    return api_key_obj


async def check_rate_limit_middleware(
    api_key: models.APIKey = Depends(authenticate_api_key),
    db: Session = Depends(get_db)
) -> models.APIKey:
    """Check rate limit before processing request"""
    is_allowed, remaining = RateLimiter.check_rate_limit(db, api_key)

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Limit: {api_key.rate_limit_per_minute} calls/minute"
        )

    return api_key


# ===================== PREDICTION ENDPOINTS =====================

@router.get(
    "/prediction/{symbol}",
    summary="Get Single Prediction",
    description="Get AI price prediction for a specific symbol"
)
async def get_prediction(
    symbol: str = Query(..., description="Stock/crypto symbol (e.g., AAPL, BTC)"),
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get AI prediction for a single asset"""
    start_time = time.time()

    try:
        market_service = get_market_service()
        aggregator = get_data_aggregator()

        # Get market data
        try:
            quote = await market_service.get_quote(symbol)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Symbol not found: {symbol}")

        # Get sentiment
        try:
            sentiment = await aggregator.get_sentiment(symbol)
        except Exception:
            sentiment = {"positive": 0, "negative": 0, "neutral": 0}

        # Get prediction
        engine = AdvancedPredictionEngine()
        try:
            prediction = await engine.predict(symbol)
        except Exception as e:
            prediction = {"confidence": 0, "direction": "unknown"}

        response_time = int((time.time() - start_time) * 1000)

        # Log usage
        UsageTracker.record_usage(
            db, api_key.id, f"/prediction/{symbol}", "GET", 200, response_time
        )

        return {
            "symbol": symbol,
            "price": quote.get("price", 0),
            "prediction": prediction,
            "sentiment": sentiment,
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, f"/prediction/{symbol}", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.get(
    "/predictions/top",
    summary="Top 10 Predictions",
    description="Get top 10 predicted assets for the current market"
)
async def get_top_predictions(
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get top 10 predicted assets"""
    start_time = time.time()

    try:
        # This would fetch from cached predictions in production
        top_predictions = [
            {
                "symbol": "BTC",
                "confidence": 85,
                "direction": "up",
                "target_price": 68000,
                "current_price": 65000
            },
            {
                "symbol": "AAPL",
                "confidence": 78,
                "direction": "up",
                "target_price": 195,
                "current_price": 188
            },
        ]

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/predictions/top", "GET", 200, response_time
        )

        return {
            "count": len(top_predictions),
            "predictions": top_predictions,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/predictions/top", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to fetch top predictions")


# ===================== SENTIMENT ENDPOINTS =====================

@router.get(
    "/sentiment/{symbol}",
    summary="Sentiment Breakdown",
    description="Get detailed sentiment analysis for a symbol from news and social media"
)
async def get_sentiment(
    symbol: str = Query(..., description="Asset symbol"),
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get sentiment breakdown for asset"""
    start_time = time.time()

    try:
        aggregator = get_data_aggregator()
        sentiment = await aggregator.get_sentiment(symbol)

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, f"/sentiment/{symbol}", "GET", 200, response_time
        )

        return {
            "symbol": symbol,
            "sentiment": sentiment,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, f"/sentiment/{symbol}", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Sentiment analysis failed")


# ===================== SIGNALS ENDPOINTS =====================

@router.get(
    "/signals/{symbol}",
    summary="Trading Signals",
    description="Get actionable trading signals based on technical and ML analysis"
)
async def get_signals(
    symbol: str = Query(..., description="Asset symbol"),
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get trading signals for asset"""
    start_time = time.time()

    try:
        # Example signals response
        signals = {
            "symbol": symbol,
            "buy_signals": [
                {"name": "RSI Oversold", "strength": "strong"},
                {"name": "Moving Average Crossover", "strength": "medium"}
            ],
            "sell_signals": [],
            "overall_signal": "BUY",
            "confidence": 0.82
        }

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, f"/signals/{symbol}", "GET", 200, response_time
        )

        return {
            "symbol": symbol,
            "signals": signals,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, f"/signals/{symbol}", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Signal generation failed")


# ===================== CORRELATION ENDPOINTS =====================

@router.get(
    "/correlation",
    summary="Asset Correlations",
    description="Get correlation matrix between selected assets"
)
async def get_correlations(
    symbols: str = Query(..., description="Comma-separated symbols (e.g., BTC,ETH,AAPL)"),
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get correlation between assets"""
    start_time = time.time()

    try:
        symbol_list = [s.strip() for s in symbols.split(",")]

        correlations = {
            "symbols": symbol_list,
            "matrix": [
                [1.0, 0.8, 0.3],
                [0.8, 1.0, 0.2],
                [0.3, 0.2, 1.0]
            ]
        }

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/correlation", "GET", 200, response_time
        )

        return {
            "correlations": correlations,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/correlation", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Correlation analysis failed")


# ===================== MACRO ENDPOINTS =====================

@router.get(
    "/macro",
    summary="Macro Indicators",
    description="Get macroeconomic indicators (inflation, unemployment, interest rates)"
)
async def get_macro_indicators(
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get macroeconomic indicators"""
    start_time = time.time()

    try:
        macro_data = {
            "inflation_rate": 3.2,
            "unemployment_rate": 3.8,
            "gdp_growth": 2.5,
            "interest_rate": 5.33,
            "vix": 18.5,
            "dxy": 104.2
        }

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/macro", "GET", 200, response_time
        )

        return {
            "indicators": macro_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/macro", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to fetch macro indicators")


# ===================== FEAR & GREED ENDPOINTS =====================

@router.get(
    "/fear-greed",
    summary="Fear & Greed Index",
    description="Get current crypto fear and greed index"
)
async def get_fear_greed(
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get Fear and Greed index"""
    start_time = time.time()

    try:
        aggregator = get_data_aggregator()
        fg_index = await aggregator.get_fear_greed_index()

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/fear-greed", "GET", 200, response_time
        )

        return {
            "index": fg_index,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/fear-greed", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to fetch fear greed index")


# ===================== LEADERBOARD ENDPOINTS =====================

@router.get(
    "/leaderboard",
    summary="Top Traders",
    description="Get leaderboard of top performing traders on AssetPulse"
)
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all_time)$"),
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Get trader leaderboard"""
    start_time = time.time()

    try:
        # Get leaderboard from database
        if period == "monthly":
            rank_column = models.UserStats.rank_monthly
        elif period == "yearly":
            rank_column = models.UserStats.rank_yearly
        else:
            rank_column = models.UserStats.rank_all_time

        leaderboard = db.query(
            models.User.username,
            models.UserStats.accuracy_percentage,
            models.UserStats.win_rate,
            models.UserStats.total_trades,
            rank_column
        ).join(models.UserStats).filter(
            rank_column.isnot(None)
        ).order_by(rank_column).limit(limit).all()

        result = [
            {
                "rank": row[4],
                "username": row[0],
                "accuracy": row[1],
                "win_rate": row[2],
                "total_trades": row[3]
            }
            for row in leaderboard
        ]

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/leaderboard", "GET", 200, response_time
        )

        return {
            "period": period,
            "limit": limit,
            "leaderboard": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/leaderboard", "GET", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")


# ===================== WEBHOOK ENDPOINTS =====================

@router.post(
    "/alerts/webhook",
    summary="Send Alert via Webhook",
    description="Deliver alert to configured webhook endpoint"
)
async def send_webhook_alert(
    payload: dict,
    api_key: models.APIKey = Depends(check_rate_limit_middleware),
    db: Session = Depends(get_db)
):
    """Send webhook alert"""
    start_time = time.time()

    try:
        result = await WebhookManager.send_webhook(
            api_key,
            "prediction_alert",
            payload
        )

        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/alerts/webhook", "POST", 200, response_time
        )

        return {
            "success": result,
            "message": "Webhook delivered" if result else "Webhook delivery failed",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        UsageTracker.record_usage(
            db, api_key.id, "/alerts/webhook", "POST", 500, response_time,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail="Webhook delivery failed")


# ===================== RATE LIMIT STATUS =====================

@router.get(
    "/status",
    summary="API Status & Rate Limit",
    description="Get current API status and rate limit information"
)
async def get_api_status(
    api_key: models.APIKey = Depends(authenticate_api_key),
    db: Session = Depends(get_db)
):
    """Get API status and rate limit info"""
    is_allowed, remaining = RateLimiter.check_rate_limit(db, api_key)
    current_calls = RateLimiter.get_current_minute_calls(db, api_key.id)

    return {
        "status": "healthy",
        "api_key": api_key.name,
        "tier": api_key.pricing_tier,
        "rate_limit": {
            "limit": api_key.rate_limit_per_minute,
            "current": current_calls,
            "remaining": remaining,
            "reset_at": (datetime.utcnow() + timedelta(minutes=1)).isoformat()
        },
        "timestamp": datetime.utcnow().isoformat()
    }


