"""
Comprehensive Data Aggregator - Collects ALL public data sources
Uses free APIs: NewsAPI, CoinGecko, Alpha Vantage, FRED, Reddit, Twitter, etc.
Fast analysis with Pandas + NumPy + async operations
"""
import asyncio
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import httpx
import json
import re
from collections import defaultdict

import pandas as pd
import numpy as np
from textblob import TextBlob

logger = logging.getLogger(__name__)


class DataAggregator:
    """
    Aggregates data from 10+ public sources for comprehensive analysis
    All data is free and publicly available
    """

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=10.0)
        self.cache = {}
        self.cache_expiry = {}

    # ============ NEWS DATA (NewsAPI) ============

    async def get_news_sentiment(self, symbol: str, days: int = 7) -> Dict:
        """
        Get news sentiment from multiple sources
        FREE: NewsAPI (100 requests/day free tier)
        """
        try:
            # Using NewsAPI (free tier available)
            urls = [
                f"https://newsapi.org/v2/everything?q={symbol}&language=en&sortBy=publishedAt&pageSize=50",
                f"https://newsapi.org/v2/everything?q={symbol} crypto&language=en&pageSize=50",
                f"https://newsapi.org/v2/everything?q={symbol} stock&language=en&pageSize=50",
            ]

            all_articles = []
            for url in urls:
                try:
                    response = await self.http_client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        all_articles.extend(data.get('articles', []))
                except Exception as e:
                    logger.warning(f"NewsAPI error: {e}")

            if not all_articles:
                return {"sentiment": 0.0, "article_count": 0}

            # Analyze sentiment
            sentiments = []
            for article in all_articles[:50]:  # Limit to 50 for speed
                text = f"{article.get('title', '')} {article.get('description', '')}"
                blob = TextBlob(text)
                sentiment = blob.sentiment.polarity
                sentiments.append(sentiment)

            avg_sentiment = np.mean(sentiments) if sentiments else 0
            sentiment_std = np.std(sentiments) if sentiments else 0

            return {
                "sentiment": float(avg_sentiment),
                "std_dev": float(sentiment_std),
                "article_count": len(all_articles),
                "articles_analyzed": len(sentiments),
                "sentiment_trend": self._calculate_trend(sentiments),
            }
        except Exception as e:
            logger.error(f"News sentiment error for {symbol}: {e}")
            return {"sentiment": 0.0, "article_count": 0}

    # ============ REDDIT DATA (using PRAW) ============

    async def get_reddit_sentiment(self, symbol: str) -> Dict:
        """
        Get Reddit sentiment from crypto/stock subreddits
        FREE: Reddit API (no API key needed for public data)
        """
        try:
            import praw

            # Reddit API (no credentials needed for public data)
            reddit = praw.Reddit(
                client_id='YOUR_CLIENT_ID',
                client_secret='YOUR_CLIENT_SECRET',
                user_agent='AssetPulse/1.0'
            )

            subreddits_to_check = [
                'cryptocurrency',
                'crypto',
                'stocks',
                'investing',
                'wallstreetbets',
                'cryptomarkets',
                f'{symbol.lower()}',
            ]

            all_sentiments = []
            mention_count = 0

            for subreddit_name in subreddits_to_check:
                try:
                    subreddit = reddit.subreddit(subreddit_name)
                    submissions = subreddit.search(symbol, time_filter='week', limit=20)

                    for submission in submissions:
                        text = f"{submission.title} {submission.selftext}"
                        blob = TextBlob(text)
                        sentiment = blob.sentiment.polarity
                        all_sentiments.append(sentiment)
                        mention_count += submission.score // 10  # Upvotes as mention weight

                except Exception as e:
                    logger.warning(f"Reddit error for {subreddit_name}: {e}")

            if not all_sentiments:
                return {"sentiment": 0.0, "mentions": 0}

            return {
                "sentiment": float(np.mean(all_sentiments)),
                "mentions": mention_count,
                "post_count": len(all_sentiments),
                "sentiment_range": [float(min(all_sentiments)), float(max(all_sentiments))],
            }
        except Exception as e:
            logger.warning(f"Reddit sentiment error: {e}")
            return {"sentiment": 0.0, "mentions": 0}

    # ============ SOCIAL MEDIA (Twitter Free API) ============

    async def get_twitter_sentiment(self, symbol: str) -> Dict:
        """
        Get Twitter sentiment from recent tweets
        FREE: Twitter API v2 (free tier available)
        """
        try:
            # Twitter API v2 free endpoint
            headers = {
                'Authorization': f'Bearer YOUR_BEARER_TOKEN'
            }

            url = f"https://api.twitter.com/2/tweets/search/recent?query={symbol}&max_results=100&tweet.fields=created_at,public_metrics"

            response = await self.http_client.get(url, headers=headers)

            if response.status_code != 200:
                return {"sentiment": 0.0, "tweets": 0}

            data = response.json()
            tweets = data.get('data', [])

            if not tweets:
                return {"sentiment": 0.0, "tweets": 0}

            sentiments = []
            engagement = 0

            for tweet in tweets:
                text = tweet.get('text', '')
                blob = TextBlob(text)
                sentiment = blob.sentiment.polarity
                sentiments.append(sentiment)

                # Weight by engagement
                metrics = tweet.get('public_metrics', {})
                engagement += metrics.get('like_count', 0) + metrics.get('retweet_count', 0)

            return {
                "sentiment": float(np.mean(sentiments)),
                "tweets": len(tweets),
                "engagement": engagement,
                "engagement_per_tweet": engagement / len(tweets) if tweets else 0,
            }
        except Exception as e:
            logger.warning(f"Twitter sentiment error: {e}")
            return {"sentiment": 0.0, "tweets": 0}

    # ============ ECONOMIC DATA (FRED - Federal Reserve) ============

    async def get_macro_data(self) -> Dict:
        """
        Get macroeconomic indicators from FRED
        FREE: FRED API (St. Louis Federal Reserve)
        """
        try:
            fred_api_key = "YOUR_FRED_API_KEY"  # Get free from fred.stlouisfed.org

            indicators = {
                'fed_rate': 'FEDFUNDS',
                'unemployment': 'UNRATE',
                'inflation': 'CPIAUCSL',
                'vix': 'VIXCLS',
            }

            macro_data = {}

            for name, series_id in indicators.items():
                url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={fred_api_key}&file_type=json&limit=1"

                response = await self.http_client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    observations = data.get('observations', [])
                    if observations:
                        macro_data[name] = float(observations[-1].get('value', 0))

            return macro_data
        except Exception as e:
            logger.warning(f"Macro data error: {e}")
            return {}

    # ============ FEAR & GREED INDEX ============

    async def get_fear_greed_index(self) -> Dict:
        """
        Get crypto fear & greed index
        FREE: alternative.me API (no auth needed)
        """
        try:
            url = "https://api.alternative.me/fng/?limit=1&format=json"

            response = await self.http_client.get(url)
            if response.status_code == 200:
                data = response.json()
                fng = data.get('data', [{}])[0]

                return {
                    "value": int(fng.get('value', 50)),
                    "classification": fng.get('value_classification', 'neutral'),
                    "timestamp": fng.get('timestamp', ''),
                }
        except Exception as e:
            logger.warning(f"Fear & Greed error: {e}")

        return {"value": 50, "classification": "neutral"}

    # ============ COINGECKO DATA (Complete Crypto Data) ============

    async def get_coingecko_data(self, symbol: str) -> Dict:
        """
        Get comprehensive crypto data from CoinGecko
        FREE: CoinGecko API (no auth needed, 10-50 calls/min)
        """
        try:
            # Map symbol to CoinGecko ID
            coingecko_mapping = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'XRP': 'ripple',
                'ADA': 'cardano',
                'SOL': 'solana',
                'DOT': 'polkadot',
                'DOGE': 'dogecoin',
                'MATIC': 'matic-network',
                'LINK': 'chainlink',
            }

            coin_id = coingecko_mapping.get(symbol.upper(), symbol.lower())

            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false"

            response = await self.http_client.get(url)
            if response.status_code == 200:
                data = response.json()
                market_data = data.get('market_data', {})

                return {
                    "price": float(market_data.get('current_price', {}).get('usd', 0)),
                    "market_cap": float(market_data.get('market_cap', {}).get('usd', 0)),
                    "volume_24h": float(market_data.get('total_volume', {}).get('usd', 0)),
                    "price_change_24h": float(market_data.get('price_change_percentage_24h', 0)),
                    "price_change_7d": float(market_data.get('price_change_percentage_7d', 0)),
                    "circulating_supply": float(data.get('circulating_supply', 0)),
                }
        except Exception as e:
            logger.warning(f"CoinGecko error for {symbol}: {e}")

        return {}

    # ============ ALPHA VANTAGE (Stock Data) ============

    async def get_stock_fundamentals(self, symbol: str) -> Dict:
        """
        Get stock fundamentals from Alpha Vantage
        FREE: Alpha Vantage API (5 calls/min free tier)
        """
        try:
            av_api_key = "YOUR_ALPHA_VANTAGE_KEY"  # Get free from alphavantageco.com

            url = f"https://www.alphavantage.co/query?function=EARNINGS&symbol={symbol}&apikey={av_api_key}"

            response = await self.http_client.get(url)
            if response.status_code == 200:
                data = response.json()
                earnings = data.get('quarterlyEarnings', [])

                if earnings:
                    latest = earnings[0]
                    return {
                        "eps": float(latest.get('reportedEPS', 0)),
                        "revenue": float(latest.get('reportedDate', '')),
                        "eps_surprise": float(latest.get('surprisePercent', 0)),
                    }
        except Exception as e:
            logger.warning(f"Alpha Vantage error for {symbol}: {e}")

        return {}

    # ============ FAST ANALYSIS UTILITIES ============

    def calculate_correlation_matrix(self, prices_dict: Dict[str, List[float]]) -> pd.DataFrame:
        """Fast correlation analysis using Pandas"""
        df = pd.DataFrame(prices_dict)
        return df.corr()

    def detect_anomalies(self, prices: List[float], threshold: float = 3.0) -> List[int]:
        """Detect price anomalies using Z-score (fast)"""
        prices_array = np.array(prices)
        z_scores = np.abs((prices_array - np.mean(prices_array)) / np.std(prices_array))
        return np.where(z_scores > threshold)[0].tolist()

    def calculate_volatility_garch(self, returns: List[float]) -> float:
        """Fast volatility calculation"""
        try:
            from arch import arch_model

            returns_array = np.array(returns)
            model = arch_model(returns_array, vol='Garch', p=1, q=1)
            fitted = model.fit(disp='off')

            return float(fitted.conditional_volatility[-1])
        except Exception as e:
            logger.warning(f"GARCH error: {e}")
            return float(np.std(returns[-20:]))  # Fallback to simple std dev

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if not values or len(values) < 2:
            return "neutral"

        first_half = np.mean(values[:len(values)//2])
        second_half = np.mean(values[len(values)//2:])

        if second_half > first_half * 1.05:
            return "strong_bullish"
        elif second_half > first_half:
            return "bullish"
        elif second_half < first_half * 0.95:
            return "strong_bearish"
        elif second_half < first_half:
            return "bearish"
        else:
            return "neutral"

    async def aggregate_all_data(self, symbol: str) -> Dict:
        """
        Aggregate ALL data sources in parallel for SPEED
        Returns comprehensive dataset for prediction
        """
        tasks = [
            self.get_news_sentiment(symbol),
            self.get_reddit_sentiment(symbol),
            self.get_twitter_sentiment(symbol),
            self.get_macro_data(),
            self.get_fear_greed_index(),
            self.get_coingecko_data(symbol) if symbol.isupper() and len(symbol) <= 5 else self.get_stock_fundamentals(symbol),
        ]

        # Run all tasks in parallel for maximum speed
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return {
            "news_sentiment": results[0] if not isinstance(results[0], Exception) else {},
            "reddit_sentiment": results[1] if not isinstance(results[1], Exception) else {},
            "twitter_sentiment": results[2] if not isinstance(results[2], Exception) else {},
            "macro_data": results[3] if not isinstance(results[3], Exception) else {},
            "fear_greed": results[4] if not isinstance(results[4], Exception) else {},
            "asset_data": results[5] if not isinstance(results[5], Exception) else {},
        }


# Global instance
data_aggregator = DataAggregator()


def get_data_aggregator() -> DataAggregator:
    """Get data aggregator instance"""
    return data_aggregator
