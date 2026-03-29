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
    converter, share, preferences, export, tools, investment
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


# Health check endpoint (use /health, not / so SPA serves at root)
# Root "/" is handled by the SPA catch-all to serve the frontend


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
