"""
Market data service for fetching stock and crypto prices
"""
import asyncio
import logging
from typing import List, Optional, Dict
import httpx
import yfinance as yf
from datetime import datetime, timedelta
from ..schemas import QuoteResponse, GainerResponse, AssetType, MarketOverview

logger = logging.getLogger(__name__)


class MarketDataService:
    """Service for fetching real-time market data"""
    
    COINGECKO_BASE = "https://api.coingecko.com/api/v3"
    
    # Popular crypto symbols to CoinGecko IDs mapping
    CRYPTO_IDS = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "BNB": "binancecoin",
        "XRP": "ripple",
        "ADA": "cardano",
        "DOGE": "dogecoin",
        "SOL": "solana",
        "DOT": "polkadot",
        "MATIC": "matic-network",
        "SHIB": "shiba-inu",
        "LTC": "litecoin",
        "AVAX": "avalanche-2",
        "LINK": "chainlink",
        "UNI": "uniswap",
        "ATOM": "cosmos",
    }
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
    
    # ============== Stock Data ==============
    
    def get_stock_quote(self, symbol: str) -> Optional[QuoteResponse]:
        """Get stock quote using yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            if not info or 'regularMarketPrice' not in info:
                return None

            current_price = info.get('regularMarketPrice', 0)
            previous_close = info.get('regularMarketPreviousClose', current_price)
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0

            return QuoteResponse(
                symbol=symbol.upper(),
                name=info.get('shortName', symbol),
                price=current_price,
                change=round(change, 2),
                change_percent=round(change_percent, 2),
                volume=info.get('regularMarketVolume'),
                market_cap=info.get('marketCap'),
                high_24h=info.get('regularMarketDayHigh'),
                low_24h=info.get('regularMarketDayLow'),
                high_52w=info.get('fiftyTwoWeekHigh'),
                low_52w=info.get('fiftyTwoWeekLow'),
                asset_type=AssetType.STOCK
            )
        except Exception as e:
            logger.error(f"Error fetching stock {symbol}: {e}")
            return None

    async def get_stock_quote_async(self, symbol: str) -> Optional[QuoteResponse]:
        """Async wrapper for get_stock_quote"""
        return self.get_stock_quote(symbol)

    async def batch_fetch_quotes(self, symbols: Dict[str, str]) -> Dict[str, Optional[QuoteResponse]]:
        """
        Batch fetch quotes for multiple symbols
        Args:
            symbols: Dict mapping symbol -> asset_type ('STOCK' or 'CRYPTO')
        Returns:
            Dict mapping symbol -> QuoteResponse
        """
        results = {}
        tasks = []

        for symbol, asset_type in symbols.items():
            if asset_type.upper() == 'STOCK':
                tasks.append((symbol, self.get_stock_quote_async(symbol)))
            else:
                tasks.append((symbol, self.get_crypto_quote(symbol)))

        # Run all tasks concurrently
        if tasks:
            responses = await asyncio.gather(*[task[1] for task in tasks], return_exceptions=True)
            for (symbol, _), response in zip(tasks, responses):
                results[symbol] = response if isinstance(response, QuoteResponse) else None

        return results
    
    def get_stock_gainers(self, limit: int = 10) -> List[GainerResponse]:
        """Get top gaining stocks"""
        try:
            # Use yfinance screener for day gainers
            gainers_symbols = [
                "PHOE", "TCGL", "RHI", "DECK", "VZ", 
                "CACC", "AAOI", "CHTR", "SNDK", "APD",
                "CL", "GME", "BBWI", "ARCB", "MOG-A"
            ]
            
            gainers = []
            for symbol in gainers_symbols[:limit]:
                quote = self.get_stock_quote(symbol)
                if quote and quote.change_percent > 0:
                    gainers.append(GainerResponse(
                        symbol=quote.symbol,
                        name=quote.name,
                        price=quote.price,
                        change=quote.change,
                        change_percent=quote.change_percent,
                        volume=quote.volume,
                        market_cap=quote.market_cap,
                        asset_type=AssetType.STOCK
                    ))
            
            return sorted(gainers, key=lambda x: x.change_percent, reverse=True)
        except Exception as e:
            logger.error(f"Error fetching stock gainers: {e}")
            return []
    
    def get_stock_history(self, symbol: str, period: str = "1mo") -> List[Dict]:
        """Get historical stock data"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            
            return [
                {
                    "date": index.isoformat(),
                    "open": row["Open"],
                    "high": row["High"],
                    "low": row["Low"],
                    "close": row["Close"],
                    "volume": row["Volume"]
                }
                for index, row in hist.iterrows()
            ]
        except Exception as e:
            logger.error(f"Error fetching stock history: {e}")
            return []
    
    # ============== Crypto Data ==============
    
    async def get_crypto_quote(self, symbol: str) -> Optional[QuoteResponse]:
        """Get crypto quote from CoinGecko"""
        try:
            coin_id = self.CRYPTO_IDS.get(symbol.upper())
            if not coin_id:
                # Try to use symbol as ID
                coin_id = symbol.lower()
            
            url = f"{self.COINGECKO_BASE}/coins/{coin_id}"
            params = {
                "localization": "false",
                "tickers": "false",
                "community_data": "false",
                "developer_data": "false"
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            market_data = data.get("market_data", {})
            
            current_price = market_data.get("current_price", {}).get("usd", 0)
            change_24h = market_data.get("price_change_24h", 0)
            change_percent = market_data.get("price_change_percentage_24h", 0)
            
            return QuoteResponse(
                symbol=symbol.upper(),
                name=data.get("name", symbol),
                price=current_price,
                change=round(change_24h, 2),
                change_percent=round(change_percent, 2),
                volume=market_data.get("total_volume", {}).get("usd"),
                market_cap=market_data.get("market_cap", {}).get("usd"),
                high_24h=market_data.get("high_24h", {}).get("usd"),
                low_24h=market_data.get("low_24h", {}).get("usd"),
                high_52w=market_data.get("ath", {}).get("usd"),
                low_52w=market_data.get("atl", {}).get("usd"),
                asset_type=AssetType.CRYPTO
            )
        except Exception as e:
            logger.error(f"Error fetching crypto {symbol}: {e}")
            return None
    
    async def get_crypto_gainers(self, limit: int = 10) -> List[GainerResponse]:
        """Get top gaining cryptocurrencies"""
        try:
            url = f"{self.COINGECKO_BASE}/coins/markets"
            params = {
                "vs_currency": "usd",
                "order": "price_change_percentage_24h_desc",
                "per_page": limit,
                "page": 1,
                "sparkline": "false",
                "price_change_percentage": "24h"
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            gainers = []
            for coin in data:
                if coin.get("price_change_percentage_24h", 0) > 0:
                    gainers.append(GainerResponse(
                        symbol=coin.get("symbol", "").upper(),
                        name=coin.get("name", ""),
                        price=coin.get("current_price", 0),
                        change=coin.get("price_change_24h", 0),
                        change_percent=round(coin.get("price_change_percentage_24h", 0), 2),
                        volume=coin.get("total_volume"),
                        market_cap=coin.get("market_cap"),
                        asset_type=AssetType.CRYPTO
                    ))
            
            return gainers
        except Exception as e:
            logger.error(f"Error fetching crypto gainers: {e}")
            return []
    
    async def get_crypto_history(self, symbol: str, days: int = 30) -> List[Dict]:
        """Get historical crypto data"""
        try:
            coin_id = self.CRYPTO_IDS.get(symbol.upper(), symbol.lower())
            url = f"{self.COINGECKO_BASE}/coins/{coin_id}/market_chart"
            params = {
                "vs_currency": "usd",
                "days": days
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            prices = data.get("prices", [])
            
            return [
                {
                    "date": datetime.fromtimestamp(p[0] / 1000).isoformat(),
                    "price": p[1]
                }
                for p in prices
            ]
        except Exception as e:
            logger.error(f"Error fetching crypto history: {e}")
            return []
    
    # ============== Market Overview ==============
    
    async def get_market_overview(self) -> MarketOverview:
        """Get overall market overview"""
        try:
            # Get index quotes
            sp500 = self.get_stock_quote("^GSPC")
            nasdaq = self.get_stock_quote("^IXIC")
            
            # Get crypto quotes
            btc = await self.get_crypto_quote("BTC")
            eth = await self.get_crypto_quote("ETH")
            
            # Get gainers
            stock_gainers = self.get_stock_gainers(5)
            crypto_gainers = await self.get_crypto_gainers(5)
            
            return MarketOverview(
                sp500=sp500,
                nasdaq=nasdaq,
                btc=btc,
                eth=eth,
                top_stock_gainers=stock_gainers,
                top_crypto_gainers=crypto_gainers
            )
        except Exception as e:
            logger.error(f"Error fetching market overview: {e}")
            return MarketOverview()


# Global service instance
market_service = MarketDataService()


def get_market_service() -> MarketDataService:
    """Get market data service instance"""
    return market_service
