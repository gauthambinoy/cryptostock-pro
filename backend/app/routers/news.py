"""
Financial news API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends
from .. import auth, models
import httpx

router = APIRouter(prefix="/api/news", tags=["News"])

NEWSDATA_API_KEY = "pub_0"
NEWSDATA_BASE_URL = "https://newsdata.io/api/1/news"

MOCK_NEWS = [
    {
        "title": "S&P 500 Hits New All-Time High Amid Strong Earnings",
        "description": "The S&P 500 index reached a new record high as major tech companies reported better-than-expected quarterly earnings.",
        "url": "https://example.com/news/sp500-high",
        "source": "Financial Times",
        "published_at": "2026-03-28T10:00:00Z",
        "image_url": None,
    },
    {
        "title": "Federal Reserve Signals Steady Rates for Coming Months",
        "description": "The Federal Reserve indicated it will keep interest rates unchanged, citing balanced economic indicators.",
        "url": "https://example.com/news/fed-rates",
        "source": "Reuters",
        "published_at": "2026-03-28T09:30:00Z",
        "image_url": None,
    },
    {
        "title": "Bitcoin Surges Past Key Resistance Level",
        "description": "Bitcoin broke through a major resistance level as institutional adoption continues to grow.",
        "url": "https://example.com/news/bitcoin-surge",
        "source": "CoinDesk",
        "published_at": "2026-03-28T08:45:00Z",
        "image_url": None,
    },
    {
        "title": "Tech Sector Leads Market Rally on AI Optimism",
        "description": "Technology stocks led a broad market rally driven by optimism around artificial intelligence investments.",
        "url": "https://example.com/news/tech-rally",
        "source": "Bloomberg",
        "published_at": "2026-03-28T08:00:00Z",
        "image_url": None,
    },
    {
        "title": "Global Supply Chain Improvements Boost Manufacturing Stocks",
        "description": "Manufacturing sector stocks rallied as global supply chain disruptions showed significant improvement.",
        "url": "https://example.com/news/manufacturing-boost",
        "source": "CNBC",
        "published_at": "2026-03-28T07:15:00Z",
        "image_url": None,
    },
]


def _parse_newsdata_response(data: dict) -> list:
    """Parse newsdata.io API response into a standard format"""
    articles = data.get("results", [])
    result = []
    for article in articles:
        result.append({
            "title": article.get("title"),
            "description": article.get("description"),
            "url": article.get("link"),
            "source": article.get("source_id"),
            "published_at": article.get("pubDate"),
            "image_url": article.get("image_url"),
        })
    return result


@router.get("/")
async def get_news(
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Get financial news. Fetches from newsdata.io, falls back to mock data.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                NEWSDATA_BASE_URL,
                params={
                    "apikey": NEWSDATA_API_KEY,
                    "category": "business",
                    "language": "en",
                }
            )
            response.raise_for_status()
            data = response.json()

            articles = _parse_newsdata_response(data)
            if articles:
                return articles
    except Exception:
        pass

    return MOCK_NEWS


@router.get("/symbol/{symbol}")
async def get_news_for_symbol(
    symbol: str,
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Get news for a specific symbol. Fetches from newsdata.io, falls back to mock data.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                NEWSDATA_BASE_URL,
                params={
                    "apikey": NEWSDATA_API_KEY,
                    "q": symbol,
                    "language": "en",
                }
            )
            response.raise_for_status()
            data = response.json()

            articles = _parse_newsdata_response(data)
            if articles:
                return articles
    except Exception:
        pass

    # Return mock data filtered/adapted for the symbol
    return [
        {
            "title": f"{symbol.upper()} Shows Strong Trading Volume",
            "description": f"Trading volume for {symbol.upper()} increased significantly in today's session.",
            "url": f"https://example.com/news/{symbol.lower()}-volume",
            "source": "Market Watch",
            "published_at": "2026-03-28T10:00:00Z",
            "image_url": None,
        },
        {
            "title": f"Analysts Update {symbol.upper()} Price Target",
            "description": f"Several major analysts have updated their price targets for {symbol.upper()} following recent performance.",
            "url": f"https://example.com/news/{symbol.lower()}-target",
            "source": "Seeking Alpha",
            "published_at": "2026-03-28T09:00:00Z",
            "image_url": None,
        },
        {
            "title": f"{symbol.upper()} Sector Performance Review",
            "description": f"A comprehensive review of {symbol.upper()} and its sector performance over the past quarter.",
            "url": f"https://example.com/news/{symbol.lower()}-review",
            "source": "Barrons",
            "published_at": "2026-03-28T08:00:00Z",
            "image_url": None,
        },
        {
            "title": f"Institutional Interest in {symbol.upper()} Grows",
            "description": f"Institutional investors have been increasing their positions in {symbol.upper()} according to recent filings.",
            "url": f"https://example.com/news/{symbol.lower()}-institutional",
            "source": "Bloomberg",
            "published_at": "2026-03-28T07:00:00Z",
            "image_url": None,
        },
        {
            "title": f"{symbol.upper()} Technical Analysis: Key Levels to Watch",
            "description": f"Technical analysts identify key support and resistance levels for {symbol.upper()} in the coming week.",
            "url": f"https://example.com/news/{symbol.lower()}-technical",
            "source": "TradingView",
            "published_at": "2026-03-28T06:00:00Z",
            "image_url": None,
        },
    ]
