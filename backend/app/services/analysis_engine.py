"""
Deep Investment Analysis Engine
Scores investments across 5 dimensions: Technical, Fundamental, Sentiment, Value, Momentum
Data sources: Yahoo Finance, CoinGecko, Reddit, News, Fear & Greed Index
"""
import yfinance as yf
import httpx
import logging
from datetime import datetime, timedelta
from math import sqrt
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)


class AnalysisEngine:
    STOCKS = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX",
        "JPM", "V", "MA", "JNJ", "UNH", "PG", "HD", "BAC",
        "XOM", "CVX", "ABBV", "PFE", "CRM", "AMD", "INTC", "ORCL",
        "ADBE", "CSCO", "QCOM", "AVGO", "TXN", "COST",
        "WMT", "DIS", "PYPL", "BA", "GS", "COIN", "SQ", "SHOP",
        "PLTR", "UBER", "NET", "CRWD", "MDB", "SNOW", "ABNB",
    ]

    CRYPTO_IDS = {
        "BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin",
        "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin",
        "SOL": "solana", "DOT": "polkadot", "MATIC": "matic-network",
        "LTC": "litecoin", "AVAX": "avalanche-2", "LINK": "chainlink",
        "UNI": "uniswap", "ATOM": "cosmos",
    }

    SECTOR_MAP = {
        "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
        "AMZN": "Consumer", "NVDA": "Technology", "META": "Technology",
        "TSLA": "Consumer", "NFLX": "Communication", "JPM": "Financial",
        "V": "Financial", "MA": "Financial", "JNJ": "Healthcare",
        "UNH": "Healthcare", "PG": "Consumer", "HD": "Consumer",
        "BAC": "Financial", "XOM": "Energy", "CVX": "Energy",
        "CRM": "Technology", "AMD": "Technology", "INTC": "Technology",
    }

    SECTOR_AVG_PE = {"Technology": 30, "Financial": 14, "Healthcare": 22, "Consumer": 25, "Energy": 12, "Communication": 20}

    # =================== MATH HELPERS ===================

    @staticmethod
    def _sma(prices, period):
        if len(prices) < period:
            return []
        return [sum(prices[i:i+period]) / period for i in range(len(prices) - period + 1)]

    @staticmethod
    def _ema(prices, period):
        if len(prices) < period:
            return prices[:]
        mult = 2 / (period + 1)
        ema = [sum(prices[:period]) / period]
        for p in prices[period:]:
            ema.append((p - ema[-1]) * mult + ema[-1])
        return ema

    @staticmethod
    def _rsi(prices, period=14):
        if len(prices) < period + 1:
            return 50
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [max(c, 0) for c in changes]
        losses = [abs(min(c, 0)) for c in changes]
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        for i in range(period, len(changes)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            return 100
        return 100 - (100 / (1 + avg_gain / avg_loss))

    # =================== TECHNICAL SCORE (0-100) ===================

    def calc_technical(self, prices, volumes=None):
        if len(prices) < 20:
            return {"score": 50, "signals": ["Insufficient data"], "rsi": 50, "macd": 0, "sma_20": 0, "sma_50": 0}

        signals = []
        score = 0
        total = 0

        rsi = round(self._rsi(prices), 1)
        total += 20
        if rsi < 30:
            score += 20; signals.append(f"RSI {rsi} - OVERSOLD (Strong Buy)")
        elif rsi < 40:
            score += 15; signals.append(f"RSI {rsi} - Approaching oversold")
        elif rsi > 70:
            score += 2; signals.append(f"RSI {rsi} - OVERBOUGHT (Sell signal)")
        elif rsi > 60:
            score += 6; signals.append(f"RSI {rsi} - Getting overbought")
        else:
            score += 10

        sma20 = self._sma(prices, 20)[-1] if len(prices) >= 20 else 0
        sma50 = self._sma(prices, 50)[-1] if len(prices) >= 50 else 0
        total += 20
        if sma20 > sma50 > 0:
            score += 18; signals.append(f"Golden Cross: SMA20 (${sma20:.0f}) > SMA50 (${sma50:.0f})")
        elif sma50 > sma20 > 0:
            score += 4; signals.append(f"Death Cross: SMA20 below SMA50 (Bearish)")
        else:
            score += 10

        if len(prices) >= 26:
            ema12 = self._ema(prices, 12)
            ema26 = self._ema(prices, 26)
            d = len(ema12) - len(ema26)
            macd = ema12[-1] - ema26[-1] if d >= 0 else 0
            signal_line = self._ema([ema12[d+i] - ema26[i] for i in range(len(ema26))], 9)
            sig = signal_line[-1] if signal_line else 0
            total += 15
            if macd > sig:
                score += 14; signals.append(f"MACD bullish ({macd:.2f} > signal {sig:.2f})")
            else:
                score += 3; signals.append(f"MACD bearish ({macd:.2f} < signal {sig:.2f})")
        else:
            macd = 0

        if len(prices) >= 20:
            sma = sum(prices[-20:]) / 20
            std = sqrt(sum((p - sma)**2 for p in prices[-20:]) / 20)
            bb_upper = sma + 2 * std
            bb_lower = sma - 2 * std
            total += 15
            if prices[-1] <= bb_lower:
                score += 15; signals.append(f"At lower Bollinger Band ${bb_lower:.0f} (Buy zone)")
            elif prices[-1] >= bb_upper:
                score += 2; signals.append(f"At upper Bollinger Band ${bb_upper:.0f} (Overbought)")
            else:
                pos = (prices[-1] - bb_lower) / (bb_upper - bb_lower) if bb_upper > bb_lower else 0.5
                score += int(15 * (1 - pos))

        if volumes and len(volumes) >= 20:
            recent = sum(volumes[-5:]) / 5
            avg = sum(volumes[-20:]) / 20
            ratio = recent / avg if avg > 0 else 1
            total += 15
            if ratio > 1.5 and prices[-1] > prices[-5]:
                score += 15; signals.append(f"Volume surge {ratio:.1f}x with price up (Accumulation)")
            elif ratio > 1.5:
                score += 3; signals.append(f"Heavy selling volume ({ratio:.1f}x)")
            else:
                score += 8

        if len(prices) >= 10:
            roc = (prices[-1] - prices[-10]) / prices[-10] * 100
            total += 15
            if roc > 5:
                score += 15; signals.append(f"10d momentum: +{roc:.1f}% (Strong)")
            elif roc > 0:
                score += 10
            elif roc > -5:
                score += 5
            else:
                score += 1; signals.append(f"10d momentum: {roc:.1f}% (Weak)")

        final = round(score / total * 100, 1) if total > 0 else 50
        return {"score": final, "signals": signals, "rsi": rsi, "macd": round(macd, 4), "sma_20": round(sma20, 2), "sma_50": round(sma50, 2)}

    # =================== FUNDAMENTAL SCORE (0-100) ===================

    def calc_fundamental(self, info, sector="Technology"):
        signals = []
        score = 0
        total = 0
        avg_pe = self.SECTOR_AVG_PE.get(sector, 25)

        pe = info.get("trailingPE") or info.get("forwardPE")
        if pe:
            total += 20
            if pe < avg_pe * 0.7:
                score += 20; signals.append(f"P/E {pe:.1f} well below sector avg {avg_pe} (Undervalued)")
            elif pe < avg_pe:
                score += 14; signals.append(f"P/E {pe:.1f} below sector avg {avg_pe}")
            elif pe > avg_pe * 1.5:
                score += 3; signals.append(f"P/E {pe:.1f} expensive vs sector avg {avg_pe}")
            else:
                score += 8

        peg = info.get("pegRatio")
        if peg and peg > 0:
            total += 15
            if peg < 1:
                score += 15; signals.append(f"PEG {peg:.2f} < 1 (Growth at good price)")
            elif peg < 2:
                score += 10
            else:
                score += 3

        margin = info.get("profitMargins")
        if margin is not None:
            total += 15
            if margin > 0.25:
                score += 15; signals.append(f"Profit margin {margin:.0%} - Excellent")
            elif margin > 0.10:
                score += 10
            elif margin > 0:
                score += 5
            else:
                score += 0; signals.append(f"Negative margin {margin:.0%}")

        growth = info.get("revenueGrowth")
        if growth is not None:
            total += 15
            if growth > 0.25:
                score += 15; signals.append(f"Revenue growth {growth:.0%} - Very strong")
            elif growth > 0.10:
                score += 10; signals.append(f"Revenue growth {growth:.0%} - Solid")
            elif growth > 0:
                score += 6
            else:
                score += 0; signals.append(f"Revenue declining {growth:.0%}")

        de = info.get("debtToEquity")
        if de is not None:
            total += 10
            de_ratio = de / 100 if de > 10 else de
            if de_ratio < 0.5:
                score += 10; signals.append(f"Low debt D/E: {de_ratio:.2f}")
            elif de_ratio < 1.5:
                score += 6
            else:
                score += 1; signals.append(f"High debt D/E: {de_ratio:.2f}")

        roe = info.get("returnOnEquity")
        if roe is not None:
            total += 10
            if roe > 0.25:
                score += 10; signals.append(f"ROE {roe:.0%} - Excellent")
            elif roe > 0.15:
                score += 7
            elif roe > 0:
                score += 4
            else:
                score += 0

        final = round(score / total * 100, 1) if total > 0 else 50
        return {"score": final, "signals": signals, "pe": pe, "peg": peg, "margin": margin, "growth": growth, "roe": roe}

    # =================== SENTIMENT SCORE (0-100) ===================

    async def calc_sentiment(self, symbol, asset_type="stock"):
        signals = []
        score = 0
        total = 0
        news_sentiment = 0
        social_mentions = 0
        social_sentiment = 0
        fear_greed = 50

        # News
        try:
            async with httpx.AsyncClient(timeout=8.0) as c:
                r = await c.get("https://newsdata.io/api/1/news", params={"apikey": "pub_0", "q": symbol, "language": "en"})
                if r.status_code == 200:
                    articles = r.json().get("results", [])[:10]
                    pos_words = ["surge","rally","gain","rise","bull","profit","growth","beat","strong","upgrade","buy","record","soar","breakout","outperform"]
                    neg_words = ["crash","fall","drop","bear","loss","decline","sell","weak","downgrade","miss","debt","risk","plunge","breakdown","underperform"]
                    pos = neg = 0
                    for a in articles:
                        text = ((a.get("title") or "") + " " + (a.get("description") or "")).lower()
                        pos += sum(1 for w in pos_words if w in text)
                        neg += sum(1 for w in neg_words if w in text)
                    if pos + neg > 0:
                        news_sentiment = round((pos - neg) / (pos + neg), 3)
                    signals.append(f"News: {len(articles)} articles, sentiment {news_sentiment:+.2f}")
        except:
            pass

        total += 30
        if news_sentiment > 0.3:
            score += 28
        elif news_sentiment > 0.1:
            score += 20
        elif news_sentiment < -0.3:
            score += 3
        elif news_sentiment < -0.1:
            score += 8
        else:
            score += 15

        # Reddit
        try:
            sub = "cryptocurrency" if asset_type == "crypto" else "stocks"
            async with httpx.AsyncClient(timeout=8.0) as c:
                r = await c.get(f"https://www.reddit.com/r/{sub}/search.json",
                    params={"q": symbol, "sort": "new", "limit": 10, "t": "week"},
                    headers={"User-Agent": "CryptoStockPro/1.0"})
                if r.status_code == 200:
                    posts = r.json().get("data", {}).get("children", [])
                    social_mentions = len(posts)
                    if posts:
                        ratios = [p["data"].get("upvote_ratio", 0.5) for p in posts]
                        social_sentiment = round(sum(ratios) / len(ratios) * 2 - 1, 3)
                        signals.append(f"Reddit: {social_mentions} posts, sentiment {social_sentiment:+.2f}")
        except:
            pass

        total += 30
        if social_sentiment > 0.3:
            score += 28
        elif social_sentiment > 0.1:
            score += 20
        elif social_sentiment < -0.2:
            score += 5
        else:
            score += 15

        # Fear & Greed
        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.get("https://api.alternative.me/fng/")
                if r.status_code == 200:
                    fear_greed = int(r.json().get("data", [{}])[0].get("value", 50))
        except:
            pass

        total += 20
        if fear_greed < 25:
            score += 18; signals.append(f"Fear & Greed: {fear_greed} (Extreme Fear = Buy opportunity)")
        elif fear_greed < 40:
            score += 14; signals.append(f"Fear & Greed: {fear_greed} (Fear)")
        elif fear_greed > 75:
            score += 4; signals.append(f"Fear & Greed: {fear_greed} (Extreme Greed = Caution)")
        else:
            score += 10

        trending = social_mentions >= 5
        total += 20
        score += 16 if trending else 10
        if trending:
            signals.append(f"Trending! {social_mentions} Reddit posts this week")

        final = round(score / total * 100, 1) if total > 0 else 50
        return {"score": final, "signals": signals, "news_sentiment": news_sentiment, "social_mentions": social_mentions, "fear_greed": fear_greed}

    # =================== VALUE SCORE (0-100) ===================

    def calc_value(self, price, info, prices):
        signals = []
        score = 0
        total = 0

        high_52 = info.get("fiftyTwoWeekHigh", max(prices) if prices else price)
        low_52 = info.get("fiftyTwoWeekLow", min(prices) if prices else price)
        dist_from_high = round((high_52 - price) / high_52 * 100, 1) if high_52 > 0 else 0

        total += 25
        if dist_from_high > 30:
            score += 25; signals.append(f"{dist_from_high:.0f}% below 52w high - Deep discount")
        elif dist_from_high > 15:
            score += 18; signals.append(f"{dist_from_high:.0f}% below 52w high")
        elif dist_from_high < 5:
            score += 4; signals.append(f"Near 52w high - Limited discount")
        else:
            score += 10

        target = info.get("targetMeanPrice")
        upside = 0
        if target and target > 0:
            upside = round((target - price) / price * 100, 1)
            total += 30
            if upside > 30:
                score += 30; signals.append(f"Analyst target ${target:.0f} (+{upside:.0f}% upside)")
            elif upside > 15:
                score += 22; signals.append(f"Analyst target ${target:.0f} (+{upside:.0f}%)")
            elif upside > 0:
                score += 12
            else:
                score += 2; signals.append(f"Analyst target ${target:.0f} ({upside:+.0f}% downside)")

        pe = info.get("trailingPE")
        eps = info.get("trailingEps")
        growth = info.get("revenueGrowth", 0.1)
        fair_value = 0
        if pe and eps and growth:
            fair_pe = max(10, min(40, abs(growth) * 100 * 1.5))
            fair_value = round(fair_pe * eps, 2)
            discount = round((fair_value - price) / price * 100, 1) if price > 0 else 0
            total += 25
            if discount > 20:
                score += 25; signals.append(f"Fair value ~${fair_value:.0f} ({discount:+.0f}% undervalued)")
            elif discount > 5:
                score += 17
            elif discount > -10:
                score += 10
            else:
                score += 3; signals.append(f"May be overvalued vs fair value ${fair_value:.0f}")

        pb = info.get("priceToBook")
        if pb:
            total += 20
            if pb < 1:
                score += 20; signals.append(f"P/B {pb:.1f} < 1 (Below book value)")
            elif pb < 3:
                score += 14
            else:
                score += 5

        final = round(score / total * 100, 1) if total > 0 else 50
        return {"score": final, "signals": signals, "high_52": high_52, "low_52": low_52, "analyst_target": target, "upside": upside, "fair_value": fair_value, "distance_from_high": dist_from_high}

    # =================== MOMENTUM SCORE (0-100) ===================

    def calc_momentum(self, prices, volumes=None, market_prices=None):
        if len(prices) < 5:
            return {"score": 50, "signals": [], "change_7d": 0, "change_30d": 0, "change_90d": 0}
        signals = []
        score = 0
        total = 0
        current = prices[-1]

        c7 = round((current - prices[-7]) / prices[-7] * 100, 2) if len(prices) >= 7 else 0
        c30 = round((current - prices[-30]) / prices[-30] * 100, 2) if len(prices) >= 30 else 0
        c90 = round((current - prices[-90]) / prices[-90] * 100, 2) if len(prices) >= 90 else 0

        total += 25
        if c7 > 5:
            score += 22; signals.append(f"7d: +{c7:.1f}% strong momentum")
        elif c7 > 2:
            score += 16
        elif c7 < -5:
            score += 3; signals.append(f"7d: {c7:.1f}% sharp decline")
        else:
            score += 10

        total += 25
        if c30 > 10:
            score += 25; signals.append(f"30d: +{c30:.1f}% very strong")
        elif c30 > 5:
            score += 18; signals.append(f"30d: +{c30:.1f}% uptrend")
        elif c30 < -10:
            score += 3
        else:
            score += 12

        ups = 0
        for i in range(len(prices)-1, 0, -1):
            if prices[i] >= prices[i-1]:
                ups += 1
            else:
                break

        total += 15
        if ups >= 5:
            score += 15; signals.append(f"{ups} consecutive up days")
        elif ups >= 3:
            score += 10
        else:
            score += 5

        if volumes and len(volumes) >= 20:
            ratio = (sum(volumes[-5:]) / 5) / (sum(volumes[-20:]) / 20) if sum(volumes[-20:]) > 0 else 1
            total += 15
            if ratio > 1.5 and c7 > 0:
                score += 15; signals.append(f"Volume surge {ratio:.1f}x with price up")
            else:
                score += 7

        if market_prices and len(market_prices) >= 30 and len(prices) >= 30:
            asset_ret = (prices[-1] - prices[-30]) / prices[-30]
            mkt_ret = (market_prices[-1] - market_prices[-30]) / market_prices[-30]
            rs = round((asset_ret - mkt_ret) * 100, 2)
            total += 20
            if rs > 5:
                score += 20; signals.append(f"Outperforming market by {rs:+.1f}%")
            elif rs > 0:
                score += 14
            else:
                score += 4; signals.append(f"Underperforming market by {rs:.1f}%")

        final = round(score / total * 100, 1) if total > 0 else 50
        return {"score": final, "signals": signals, "change_7d": c7, "change_30d": c30, "change_90d": c90}

    # =================== PROFIT PREDICTION ===================

    def calc_prediction(self, price, tech, fund, val, mom, overall, prices):
        # Entry = current price
        # Stop loss based on Fibonacci/Bollinger or 8% default
        if len(prices) >= 60:
            recent_low = min(prices[-60:])
            stop = round(max(recent_low * 0.97, price * 0.92), 2)
        else:
            stop = round(price * 0.92, 2)

        # Targets from multiple sources
        targets = []
        if val.get("analyst_target") and val["analyst_target"] > price:
            targets.append(val["analyst_target"])
        if val.get("fair_value") and val["fair_value"] > price:
            targets.append(val["fair_value"])
        if mom.get("change_30d", 0) > 0:
            targets.append(price * (1 + mom["change_30d"] / 100 * 3))

        if targets:
            avg = sum(targets) / len(targets)
            t_short = round(price + (avg - price) * 0.3, 2)
            t_med = round(price + (avg - price) * 0.7, 2)
            t_long = round(avg * 1.1, 2)
        else:
            mult = 1 + overall / 500  # higher score = higher target
            t_short = round(price * (1 + (mult - 1) * 0.3), 2)
            t_med = round(price * mult, 2)
            t_long = round(price * mult * 1.1, 2)

        ret = round((t_med - price) / price * 100, 2) if price > 0 else 0

        # Confidence = how many dimensions agree
        agrees = sum(1 for s in [tech["score"], fund["score"], val["score"], mom["score"]] if s > 55)
        confidence = round(min(0.95, 0.3 + agrees * 0.15), 2)

        # Risk
        if len(prices) >= 20:
            rets = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
            vol = sqrt(sum(r**2 for r in rets[-20:]) / 20) * sqrt(252) * 100
            risk = "high" if vol > 50 else ("medium" if vol > 25 else "low")
        else:
            risk = "medium"

        timeframe = "short" if mom.get("change_7d", 0) > 3 and tech["score"] > 60 else ("medium" if overall > 60 else "long")
        rr = round((t_med - price) / (price - stop), 2) if price > stop else 0

        return {
            "entry_price": price, "target_short": t_short, "target_medium": t_med,
            "target_long": t_long, "stop_loss": stop, "expected_return_pct": ret,
            "confidence": confidence, "risk_level": risk, "timeframe": timeframe,
            "risk_reward_ratio": rr,
        }

    # =================== FULL STOCK ANALYSIS ===================

    async def analyze_stock(self, symbol):
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
            hist = ticker.history(period="1y")
            if len(hist) == 0:
                return None

            prices = hist["Close"].tolist()
            volumes = hist["Volume"].tolist()
            current = info.get("currentPrice") or info.get("regularMarketPrice") or prices[-1]
            name = info.get("shortName", symbol)
            sector = self.SECTOR_MAP.get(symbol, "Technology")

            try:
                spy = yf.Ticker("^GSPC").history(period="1y")
                mkt = spy["Close"].tolist()
            except:
                mkt = []

            tech = self.calc_technical(prices, volumes)
            fund = self.calc_fundamental(info, sector)
            sent = await self.calc_sentiment(symbol, "stock")
            val = self.calc_value(current, info, prices)
            mom = self.calc_momentum(prices, volumes, mkt)

            overall = round(tech["score"] * 0.25 + fund["score"] * 0.25 + sent["score"] * 0.20 + val["score"] * 0.15 + mom["score"] * 0.15, 1)

            if overall >= 75: signal = "strong_buy"
            elif overall >= 60: signal = "buy"
            elif overall >= 40: signal = "hold"
            elif overall >= 25: signal = "sell"
            else: signal = "strong_sell"

            pred = self.calc_prediction(current, tech, fund, val, mom, overall, prices)
            reasons = (tech["signals"] + fund["signals"] + sent["signals"] + val["signals"] + mom["signals"])[:10]

            return {
                "symbol": symbol, "name": name, "asset_type": "stock",
                "current_price": round(current, 2), "overall_score": overall, "signal": signal,
                "technical": tech, "fundamental": fund, "sentiment": sent,
                "value": val, "momentum": mom, "prediction": pred,
                "top_reasons": reasons, "last_updated": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return None

    # =================== FULL CRYPTO ANALYSIS ===================

    async def analyze_crypto(self, symbol):
        coin_id = self.CRYPTO_IDS.get(symbol)
        if not coin_id:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.get(f"https://api.coingecko.com/api/v3/coins/{coin_id}",
                    params={"localization": "false", "tickers": "false", "community_data": "true", "developer_data": "true"})
                if r.status_code != 200:
                    return None
                coin = r.json()
                market = coin.get("market_data", {})
                current = market.get("current_price", {}).get("usd", 0)
                name = coin.get("name", symbol)

                hr = await c.get(f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart",
                    params={"vs_currency": "usd", "days": "365"})
                prices = [p[1] for p in hr.json().get("prices", [])] if hr.status_code == 200 else []
                volumes = [v[1] for v in hr.json().get("total_volumes", [])] if hr.status_code == 200 else []

            if not prices:
                return None

            tech = self.calc_technical(prices, volumes)
            sent = await self.calc_sentiment(symbol, "crypto")

            # Crypto "fundamentals"
            fund_signals = []
            fund_score_pts = 0
            fund_total = 0
            rank = coin.get("market_cap_rank", 999)
            fund_total += 20
            if rank and rank <= 10:
                fund_score_pts += 20; fund_signals.append(f"Top {rank} crypto by market cap")
            elif rank and rank <= 30:
                fund_score_pts += 14
            else:
                fund_score_pts += 5

            ath = market.get("ath", {}).get("usd", 0)
            ath_chg = market.get("ath_change_percentage", {}).get("usd", 0)
            fund_total += 20
            if ath_chg < -70:
                fund_score_pts += 20; fund_signals.append(f"{ath_chg:.0f}% from ATH - Deep value")
            elif ath_chg < -40:
                fund_score_pts += 15; fund_signals.append(f"{ath_chg:.0f}% from ATH")
            elif ath_chg > -10:
                fund_score_pts += 4; fund_signals.append(f"Near ATH")
            else:
                fund_score_pts += 10

            commits = coin.get("developer_data", {}).get("commit_count_4_weeks", 0)
            fund_total += 15
            if commits > 100:
                fund_score_pts += 15; fund_signals.append(f"Active dev: {commits} commits/4wk")
            elif commits > 30:
                fund_score_pts += 10
            else:
                fund_score_pts += 3

            fund = {"score": round(fund_score_pts / fund_total * 100, 1) if fund_total > 0 else 50, "signals": fund_signals, "pe": None, "peg": None, "margin": None, "growth": None, "roe": None}

            info = {"fiftyTwoWeekHigh": max(prices), "fiftyTwoWeekLow": min(prices), "targetMeanPrice": ath * 0.6 if ath else None}
            val = self.calc_value(current, info, prices)
            mom = self.calc_momentum(prices, volumes)

            overall = round(tech["score"] * 0.30 + fund["score"] * 0.20 + sent["score"] * 0.25 + val["score"] * 0.10 + mom["score"] * 0.15, 1)

            if overall >= 75: signal = "strong_buy"
            elif overall >= 60: signal = "buy"
            elif overall >= 40: signal = "hold"
            elif overall >= 25: signal = "sell"
            else: signal = "strong_sell"

            pred = self.calc_prediction(current, tech, fund, val, mom, overall, prices)
            reasons = (tech["signals"] + fund["signals"] + sent["signals"] + val["signals"] + mom["signals"])[:10]

            return {
                "symbol": symbol, "name": name, "asset_type": "crypto",
                "current_price": round(current, 2), "overall_score": overall, "signal": signal,
                "technical": tech, "fundamental": fund, "sentiment": sent,
                "value": val, "momentum": mom, "prediction": pred,
                "top_reasons": reasons, "last_updated": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error analyzing crypto {symbol}: {e}")
            return None

    # =================== TOP PICKS ===================

    async def get_top_picks(self, asset_type="all", limit=20):
        results = []

        if asset_type in ("all", "stock"):
            for sym in self.STOCKS[:20]:
                try:
                    a = await self.analyze_stock(sym)
                    if a and a["current_price"] > 0:
                        results.append(a)
                except:
                    pass

        if asset_type in ("all", "crypto"):
            for sym in list(self.CRYPTO_IDS.keys())[:10]:
                try:
                    a = await self.analyze_crypto(sym)
                    if a and a["current_price"] > 0:
                        results.append(a)
                except:
                    pass

        results.sort(key=lambda x: x["prediction"]["expected_return_pct"] * x["prediction"]["confidence"] * x["overall_score"] / 100, reverse=True)
        return results[:limit]

    # =================== MARKET PULSE ===================

    async def get_market_pulse(self):
        try:
            spy = yf.Ticker("^GSPC")
            spy_info = spy.info or {}
            spy_hist = spy.history(period="1mo")
            spy_prices = spy_hist["Close"].tolist() if len(spy_hist) > 0 else []
            spy_change = spy_info.get("regularMarketChangePercent", 0)

            if spy_change > 1:
                trend = "bullish"
            elif spy_change < -1:
                trend = "bearish"
            else:
                trend = "neutral"

            sp500_price = spy_info.get("regularMarketPrice", 0)
        except:
            trend = "neutral"
            sp500_price = 0
            spy_change = 0

        fear_greed = 50
        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.get("https://api.alternative.me/fng/")
                if r.status_code == 200:
                    fear_greed = int(r.json().get("data", [{}])[0].get("value", 50))
        except:
            pass

        return {
            "market_trend": trend, "fear_greed_index": fear_greed,
            "sp500": {"price": sp500_price, "change_pct": round(spy_change, 2)},
            "summary": f"Market is {trend}. Fear & Greed at {fear_greed}. {'Good time to look for bargains.' if fear_greed < 40 else 'Be cautious with new positions.' if fear_greed > 70 else 'Mixed signals - be selective.'}",
        }


_engine = None

def get_analysis_engine():
    global _engine
    if _engine is None:
        _engine = AnalysisEngine()
    return _engine
