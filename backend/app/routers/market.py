"""
Market data API endpoints
"""
import asyncio
import json
import logging
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from .. import schemas, auth, models
from ..services.market_data import get_market_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/market", tags=["Market Data"])


@router.get("/overview", response_model=schemas.MarketOverview)
async def get_market_overview():
    """
    Get market overview with major indices and top gainers
    """
    market_service = get_market_service()
    return await market_service.get_market_overview()


@router.get("/stocks/quote/{symbol}", response_model=schemas.QuoteResponse)
async def get_stock_quote(symbol: str):
    """
    Get real-time stock quote
    """
    market_service = get_market_service()
    quote = market_service.get_stock_quote(symbol.upper())
    
    if not quote:
        raise HTTPException(
            status_code=404,
            detail=f"Stock {symbol} not found"
        )
    
    return quote


@router.get("/stocks/gainers", response_model=List[schemas.GainerResponse])
async def get_stock_gainers(limit: int = 10):
    """
    Get top gaining stocks today
    """
    market_service = get_market_service()
    return market_service.get_stock_gainers(limit)


@router.get("/stocks/history/{symbol}")
async def get_stock_history(symbol: str, period: str = "1mo"):
    """
    Get historical stock data
    
    Periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    market_service = get_market_service()
    history = market_service.get_stock_history(symbol.upper(), period)
    
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No history found for {symbol}"
        )
    
    return history


@router.get("/crypto/quote/{symbol}", response_model=schemas.QuoteResponse)
async def get_crypto_quote(symbol: str):
    """
    Get real-time cryptocurrency quote
    """
    market_service = get_market_service()
    quote = await market_service.get_crypto_quote(symbol.upper())
    
    if not quote:
        raise HTTPException(
            status_code=404,
            detail=f"Cryptocurrency {symbol} not found"
        )
    
    return quote


@router.get("/crypto/gainers", response_model=List[schemas.GainerResponse])
async def get_crypto_gainers(limit: int = 10):
    """
    Get top gaining cryptocurrencies (24h)
    """
    market_service = get_market_service()
    return await market_service.get_crypto_gainers(limit)


@router.get("/crypto/history/{symbol}")
async def get_crypto_history(symbol: str, days: int = 30):
    """
    Get historical cryptocurrency data
    """
    market_service = get_market_service()
    history = await market_service.get_crypto_history(symbol.upper(), days)
    
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No history found for {symbol}"
        )
    
    return history


@router.get("/search")
async def search_assets(query: str, asset_type: Optional[str] = None):
    """
    Search for stocks and cryptocurrencies
    """
    results = []
    market_service = get_market_service()
    
    # Search stocks
    if not asset_type or asset_type == "stock":
        try:
            import yfinance as yf
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            if info and 'shortName' in info:
                results.append({
                    "symbol": query.upper(),
                    "name": info.get('shortName', query),
                    "asset_type": "stock",
                    "exchange": info.get('exchange', 'N/A')
                })
        except:
            pass
    
    # Search crypto (check our mapping)
    if not asset_type or asset_type == "crypto":
        query_upper = query.upper()
        for symbol, coin_id in market_service.CRYPTO_IDS.items():
            if query_upper in symbol or query.lower() in coin_id:
                quote = await market_service.get_crypto_quote(symbol)
                if quote:
                    results.append({
                        "symbol": symbol,
                        "name": quote.name,
                        "asset_type": "crypto"
                    })
    
    return results


# ============== WebSocket for Real-Time Updates ==============

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: dict = {}  # websocket -> list of symbols
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = []
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
    
    def subscribe(self, websocket: WebSocket, symbols: List[str]):
        self.subscriptions[websocket] = symbols
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time price updates
    
    Send: {"action": "subscribe", "symbols": ["BTC", "AAPL"]}
    Receive: {"symbol": "BTC", "price": 45000, "change": 1.5}
    """
    await manager.connect(websocket)
    market_service = get_market_service()
    
    try:
        while True:
            # Receive subscription updates
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                message = json.loads(data)
                
                if message.get("action") == "subscribe":
                    symbols = message.get("symbols", [])
                    manager.subscribe(websocket, symbols)
                    await manager.send_personal_message(
                        json.dumps({"status": "subscribed", "symbols": symbols}),
                        websocket
                    )
            except asyncio.TimeoutError:
                pass
            
            # Send price updates for subscribed symbols
            symbols = manager.subscriptions.get(websocket, [])
            if symbols:
                # Build symbol dict for batch fetching (try as crypto first)
                symbol_dict: Dict[str, str] = {s: "CRYPTO" for s in symbols}

                # Batch fetch all quotes concurrently
                quotes = await market_service.batch_fetch_quotes(symbol_dict)

                updates = []
                for symbol in symbols:
                    quote = quotes.get(symbol)
                    if quote:
                        updates.append({
                            "symbol": quote.symbol,
                            "price": quote.price,
                            "change": quote.change,
                            "change_percent": quote.change_percent,
                            "asset_type": quote.asset_type.value
                        })

                if updates:
                    await manager.send_personal_message(
                        json.dumps({"type": "prices", "data": updates}),
                        websocket
                    )

            # Wait before next update cycle
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
