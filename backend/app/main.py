"""
CryptoStock Pro - Main Application Entry Point
A professional real-time Stock & Cryptocurrency Portfolio Tracker
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
from .routers import (
    auth, portfolio, market, alerts,
    analytics, watchlist, transactions, goals,
    dividends, news, leaderboard, prediction,
    converter, share, preferences, export
)

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting CryptoStock Pro...")
    init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Shutting down CryptoStock Pro...")


# Create FastAPI app
app = FastAPI(
    title="CryptoStock Pro API",
    description="""
    ## 📈 Real-time Stock & Cryptocurrency Portfolio Tracker
    
    A professional portfolio management API with:
    
    * **Authentication** - Secure JWT-based auth
    * **Portfolio Management** - Track your holdings
    * **Real-time Data** - Live stock and crypto prices
    * **Alerts** - Price target notifications
    * **Analytics** - Performance metrics and charts
    
    ### Security
    All endpoints (except auth) require a valid JWT token.
    Include the token in the Authorization header:
    ```
    Authorization: Bearer <your_token>
    ```
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__}
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


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """API health check"""
    return {
        "name": "CryptoStock Pro API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "version": "1.0.0"
    }


# API info endpoint
@app.get("/api", tags=["Info"])
async def api_info():
    """API information and available endpoints"""
    return {
        "name": "CryptoStock Pro",
        "version": "1.0.0",
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
            }
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
