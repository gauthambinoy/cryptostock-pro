"""
AssetPulse - Main Application Entry Point
AI-Powered Profit Prediction Platform
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager

from .config import get_settings
from .database import init_db
from .tasks import initialize_scheduler, shutdown_scheduler, init_alert_scheduler, stop_alert_scheduler
from .routers import (
    auth, portfolio, market, alerts,
    analytics, watchlist, transactions, goals,
    dividends, news, leaderboard, prediction,
    converter, share, preferences, export, tools, investment, chat, backtest, trading, chart, subscriptions,
    api_v1, developer
)

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting AssetPulse - 90%+ Accuracy Profit Prediction...")
    init_db()
    print("✅ Database initialized")
    print("📊 Data aggregator ready (News + Reddit + Twitter + FRED + CoinGecko)")
    print("🤖 ML ensemble prediction engine loaded")
    try:
        initialize_scheduler()
        print("📅 Leaderboard scheduler initialized")
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize leaderboard scheduler: {e}")
    try:
        init_alert_scheduler()
        print("🔔 Alert scheduler initialized")
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize alert scheduler: {e}")
    yield
    # Shutdown
    print("👋 Shutting down AssetPulse...")
    try:
        shutdown_scheduler()
    except Exception as e:
        print(f"⚠️ Warning: Error shutting down scheduler: {e}")
    try:
        stop_alert_scheduler()
    except Exception as e:
        print(f"⚠️ Warning: Error shutting down alert scheduler: {e}")


# Create FastAPI app
app = FastAPI(
    title="AssetPulse API",
    description="""
    ## 🚀 AI-Powered Profit Prediction Platform

    Advanced machine learning platform with 90%+ prediction accuracy using:

    * **90%+ Accuracy Predictions** - ML ensemble + sentiment analysis
    * **Multi-Source Data** - News, Reddit, Twitter, FRED, CoinGecko
    * **Portfolio Management** - Real-time holdings tracking
    * **Risk Analysis** - GARCH volatility + correlation analysis
    * **Sentiment Tracking** - News + social media sentiment

    ### Key Features
    - Sentiment analysis from 1000+ news sources + Reddit + Twitter
    - Macroeconomic data from Federal Reserve (FRED)
    - Crypto fear & greed index integration
    - Cross-asset correlation analysis
    - GARCH volatility prediction
    - 5-model ML ensemble (Random Forest, Linear Regression, ARIMA, etc.)

    ### Data Sources (All FREE, No Subscriptions)
    - News: NewsAPI
    - Social: Reddit API, Twitter API v2
    - Economics: FRED (St. Louis Federal Reserve)
    - Crypto: CoinGecko, Fear & Greed Index
    - Stocks: Alpha Vantage

    ### Security
    All endpoints (except auth) require a valid JWT token in httpOnly cookies.
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS (restricted methods and headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# Security headers middleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions - don't expose internal details"""
    import logging
    logging.getLogger(__name__).error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Include routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(market.router)
app.include_router(alerts.router)
app.include_router(watchlist.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(dividends.router)
app.include_router(news.router)
app.include_router(leaderboard.router)
app.include_router(analytics.router)
app.include_router(prediction.router)
app.include_router(converter.router)
app.include_router(share.router)
app.include_router(preferences.router)
app.include_router(export.router)
app.include_router(tools.router)
app.include_router(investment.router)
app.include_router(chat.router)
app.include_router(backtest.router)
app.include_router(trading.router)
app.include_router(chart.router)
app.include_router(api_v1.router)
app.include_router(developer.router)
app.include_router(subscriptions.router)


# Health check endpoint (use /health, not / so SPA serves at root)
# Root "/" is handled by the SPA catch-all to serve the frontend


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "version": "2.0.0",
        "accuracy": "90%+",
        "data_sources": "News + Reddit + Twitter + FRED + CoinGecko + Fear&Greed"
    }


# API info endpoint
@app.get("/api", tags=["Info"])
async def api_info():
    """API information and available endpoints"""
    return {
        "name": "AssetPulse",
        "version": "2.0.0",
        "endpoints": {
            "auth": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login",
                "me": "GET /api/auth/me"
            },
            "portfolio": {
                "list": "GET /api/portfolio",
                "holdings": "GET /api/portfolio/{id}/holdings",
                "add_holding": "POST /api/portfolio/{id}/holdings",
                "performance": "GET /api/portfolio/{id}/performance"
            },
            "market": {
                "overview": "GET /api/market/overview",
                "stock_quote": "GET /api/market/stocks/quote/{symbol}",
                "crypto_quote": "GET /api/market/crypto/quote/{symbol}",
                "stock_gainers": "GET /api/market/stocks/gainers",
                "crypto_gainers": "GET /api/market/crypto/gainers",
                "websocket": "WS /api/market/ws"
            },
            "alerts": {
                "list": "GET /api/alerts",
                "create": "POST /api/alerts",
                "delete": "DELETE /api/alerts/{id}",
                "check": "POST /api/alerts/check"
            },
            "prediction": {
                "technical": "GET /api/prediction/{symbol}",
                "ml": "GET /api/prediction/{symbol}/ml",
                "advanced_90_percent": "GET /api/prediction/{symbol}/advanced"
            }
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }


# Serve frontend static files (for production/HuggingFace deployment)
import os
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

static_dir = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "static"))

def _safe_path(base: str, user_path: str):
    """Prevent path traversal by ensuring resolved path is within base directory."""
    resolved = os.path.normpath(os.path.join(base, user_path))
    if not resolved.startswith(base):
        return None
    return resolved

if os.path.exists(static_dir):
    from fastapi.staticfiles import StaticFiles
    # Mount static assets directory directly - this is the correct way
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="static-assets")

    # Override 404 handler to serve index.html for SPA routes (not API routes)
    @app.exception_handler(404)
    async def spa_fallback(request, exc):
        path = request.url.path
        # Don't intercept API routes, docs, health check
        if path.startswith("/api") or path.startswith("/docs") or path.startswith("/redoc") or path == "/openapi.json" or path == "/health":
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        # Try serving the exact file
        if path != "/":
            safe = _safe_path(static_dir, path.lstrip("/"))
            if safe and os.path.exists(safe) and os.path.isfile(safe):
                return FileResponse(safe)

        # Fallback to index.html for SPA client-side routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

        return JSONResponse(status_code=404, content={"detail": "Not found"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
