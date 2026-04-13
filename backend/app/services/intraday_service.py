"""
Intraday crypto trading intelligence service.
Data: Binance public API + Alternative.me Fear/Greed + CoinGecko global.
No API keys required. Optional: WHALE_ALERT_API_KEY env var.
Algorithms: RSI, MACD, Bollinger, Volume Spike, Funding Rate,
            OI Delta, Multi-TF RSI Confluence, ATR Breakout.
"""
import os
import asyncio
import logging
import time
from typing import Optional
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

# ─── Symbol Lists ─────────────────────────────────────────────────────────────

SPOT_SYMBOLS = [
    # Large cap
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "DOTUSDT", "LINKUSDT",
    "LTCUSDT", "BCHUSDT", "ETCUSDT", "XLMUSDT", "UNIUSDT",
    "ATOMUSDT", "NEARUSDT", "APTUSDT", "SUIUSDT", "VETUSDT",
    # DeFi
    "AAVEUSDT", "MKRUSDT", "SNXUSDT", "CRVUSDT", "SUSHIUSDT",
    "1INCHUSDT", "COMPUSDT",
    # Layer 2 / new L1
    "ARBUSDT", "OPUSDT", "IMXUSDT", "INJUSDT", "SEIUSDT",
    "TIAUSDT", "PYTHUSDT", "JUPUSDT",
    # Meme
    "SHIBUSDT", "PEPEUSDT", "FLOKIUSDT", "WIFUSDT", "BONKUSDT",
    # AI / Infrastructure
    "FETUSDT", "RNDRUSDT", "AGIXUSDT", "OCEANUSDT",
    # Gaming / Metaverse
    "SANDUSDT", "MANAUSDT", "ENJUSDT", "AXSUSDT", "GALAUSDT",
    # Other popular
    "FTMUSDT", "RUNEUSDT", "FILUSDT", "EGLDUSDT", "FLOWUSDT",
    "THETAUSDT", "ZECUSDT", "BATUSDT", "ALGOUSDT", "HBARUSDT",
    "MATICUSDT", "STXUSDT", "CFXUSDT", "MINAUSDT", "LDOUSDT",
]

# Symbols with Binance perpetual futures (funding rates + OI available)
FUTURES_SYMBOLS = {
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "DOTUSDT", "LINKUSDT",
    "LTCUSDT", "BCHUSDT", "ETCUSDT", "UNIUSDT", "ATOMUSDT",
    "NEARUSDT", "APTUSDT", "SUIUSDT", "AAVEUSDT", "ARBUSDT",
    "OPUSDT", "INJUSDT", "SHIBUSDT", "PEPEUSDT", "FETUSDT",
    "RNDRUSDT", "SANDUSDT", "AXSUSDT", "RUNEUSDT", "FILUSDT",
    "GALAUSDT", "FTMUSDT", "MATICUSDT", "SEIUSDT", "WIFUSDT",
    "BONKUSDT", "TIAUSDT", "LDOUSDT", "CFXUSDT",
}

# ─── Technical Indicator Math (pure Python, no deps) ─────────────────────────

def calc_rsi(closes: list, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(0.0, d) for d in deltas[-period:]]
    losses = [max(0.0, -d) for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def calc_ema(values: list, period: int) -> list:
    if len(values) < period:
        return values[:]
    k = 2.0 / (period + 1)
    ema = [sum(values[:period]) / period]
    for v in values[period:]:
        ema.append(v * k + ema[-1] * (1 - k))
    return ema


def calc_macd(closes: list) -> tuple:
    """Returns (macd_val, signal_val, histogram, prev_histogram)."""
    if len(closes) < 35:
        return 0.0, 0.0, 0.0, 0.0
    ema12 = calc_ema(closes, 12)
    ema26 = calc_ema(closes, 26)
    # Align from end (ema26 is shorter by 14 values)
    n = min(len(ema12), len(ema26))
    if n < 10:
        return 0.0, 0.0, 0.0, 0.0
    macd_line = [ema12[-(n - i)] - ema26[-(n - i)] for i in range(n)]
    if len(macd_line) < 9:
        return macd_line[-1], macd_line[-1], 0.0, 0.0
    signal_line = calc_ema(macd_line, 9)
    if len(signal_line) < 2:
        hist = macd_line[-1] - (signal_line[-1] if signal_line else 0)
        return macd_line[-1], signal_line[-1] if signal_line else 0.0, hist, 0.0
    hist = macd_line[-1] - signal_line[-1]
    prev_hist = macd_line[-2] - signal_line[-2]
    return macd_line[-1], signal_line[-1], hist, prev_hist


def calc_bollinger(closes: list, period: int = 20) -> tuple:
    """Returns (upper, middle, lower) for last candle."""
    if len(closes) < period:
        p = closes[-1] if closes else 0.0
        return p, p, p
    recent = closes[-period:]
    middle = sum(recent) / period
    variance = sum((x - middle) ** 2 for x in recent) / period
    std = variance ** 0.5
    return middle + 2 * std, middle, middle - 2 * std


def calc_atr(highs: list, lows: list, closes: list, period: int = 14) -> float:
    """ATR as percentage of current price."""
    if len(closes) < 2:
        return 2.0
    n = min(period, len(closes) - 1, len(highs) - 1, len(lows) - 1)
    if n < 1:
        return 2.0
    trs = []
    for i in range(1, n + 1):
        h = highs[-i] if i <= len(highs) else closes[-i]
        l = lows[-i] if i <= len(lows) else closes[-i]
        pc = closes[-(i + 1)]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    atr = sum(trs) / len(trs)
    price = closes[-1]
    return round(atr / price * 100, 3) if price > 0 else 2.0


def calc_signal_ensemble(
    closes_15m: list, closes_1h: list, closes_4h: list,
    highs_15m: list, lows_15m: list, volumes_15m: list,
    funding_rate: float = 0.0,
    oi_change_pct: float = 0.0,
) -> dict:
    """
    Run 8 algorithms and return ensemble signal.
    Returns: {direction, strength, confluence, algorithms, all_signals, reason, rsi_*, atr_pct}
    """
    if not closes_15m or len(closes_15m) < 20:
        return {
            "direction": "NEUTRAL", "strength": 0, "confluence": 0,
            "algorithms": [], "all_signals": [], "reason": "Insufficient data",
            "rsi_15m": 50, "rsi_1h": 50, "rsi_4h": 50, "atr_pct": 2.0,
        }

    signals = []  # (name, direction, strength)

    # ── 1. RSI Oversold / Overbought ─────────────────────────────────────────
    rsi_15m = calc_rsi(closes_15m[-60:])
    if rsi_15m < 32:
        signals.append(("RSI Oversold", "LONG", min(90, (32 - rsi_15m) * 3.5)))
    elif rsi_15m > 68:
        signals.append(("RSI Overbought", "SHORT", min(90, (rsi_15m - 68) * 3.5)))

    # ── 2. MACD Crossover ────────────────────────────────────────────────────
    try:
        _, _, hist, prev_hist = calc_macd(closes_15m)
        if prev_hist <= 0 < hist:
            signals.append(("MACD Cross UP", "LONG", 72))
        elif prev_hist >= 0 > hist:
            signals.append(("MACD Cross DOWN", "SHORT", 72))
    except Exception:
        pass

    # ── 3. Bollinger Band Squeeze / Breakout ─────────────────────────────────
    upper, middle, lower = calc_bollinger(closes_15m)
    band_width_pct = (upper - lower) / middle * 100 if middle > 0 else 5.0
    price = closes_15m[-1]
    if band_width_pct < 3.0:  # squeeze
        if price > upper:
            signals.append(("BB Squeeze Breakout UP", "LONG", 77))
        elif price < lower:
            signals.append(("BB Squeeze Breakout DOWN", "SHORT", 77))
    elif price > upper * 1.004:
        signals.append(("BB Extended Above", "SHORT", 52))
    elif price < lower * 0.996:
        signals.append(("BB Extended Below", "LONG", 52))

    # ── 4. Volume Spike ──────────────────────────────────────────────────────
    if len(volumes_15m) >= 22:
        vol_avg = sum(volumes_15m[-21:-1]) / 20
        vol_curr = volumes_15m[-1]
        if vol_avg > 0 and vol_curr > vol_avg * 2.2:
            spike_str = min(88, (vol_curr / vol_avg - 1) * 25)
            direction = "LONG" if closes_15m[-1] > closes_15m[-2] else "SHORT"
            signals.append(("Volume Spike", direction, spike_str))

    # ── 5. Funding Rate Extreme ───────────────────────────────────────────────
    if funding_rate != 0.0:
        if funding_rate > 0.07:
            signals.append(("Funding: Longs Overheated", "SHORT", min(83, funding_rate * 800)))
        elif funding_rate > 0.03:
            signals.append(("Funding: Longs Dominant", "SHORT", 46))
        elif funding_rate < -0.04:
            signals.append(("Funding: Shorts Overheated", "LONG", min(83, abs(funding_rate) * 1200)))
        elif funding_rate < -0.01:
            signals.append(("Funding: Shorts Dominant", "LONG", 46))

    # ── 6. Open Interest Delta ────────────────────────────────────────────────
    if oi_change_pct != 0.0 and len(closes_15m) >= 6:
        price_change_pct = (closes_15m[-1] - closes_15m[-6]) / closes_15m[-6] * 100
        if oi_change_pct > 3 and price_change_pct > 0.5:
            signals.append(("OI + Price Rising", "LONG", min(78, oi_change_pct * 8)))
        elif oi_change_pct > 3 and price_change_pct < -0.5:
            signals.append(("OI Rising, Price Falling", "SHORT", min(75, oi_change_pct * 7)))
        elif oi_change_pct < -3:
            signals.append(("OI Unwinding", "SHORT", min(62, abs(oi_change_pct) * 6)))

    # ── 7. Multi-Timeframe RSI Confluence ────────────────────────────────────
    rsi_1h = calc_rsi(closes_1h[-60:]) if len(closes_1h) >= 15 else 50.0
    rsi_4h = calc_rsi(closes_4h[-60:]) if len(closes_4h) >= 15 else 50.0
    tf_long = sum(1 for r in [rsi_15m, rsi_1h, rsi_4h] if r < 40)
    tf_short = sum(1 for r in [rsi_15m, rsi_1h, rsi_4h] if r > 60)
    if tf_long == 3:
        signals.append(("Multi-TF Oversold (3/3)", "LONG", 88))
    elif tf_long == 2:
        signals.append(("Multi-TF Oversold (2/3)", "LONG", 65))
    elif tf_short == 3:
        signals.append(("Multi-TF Overbought (3/3)", "SHORT", 88))
    elif tf_short == 2:
        signals.append(("Multi-TF Overbought (2/3)", "SHORT", 65))

    # ── 8. ATR Range Breakout ─────────────────────────────────────────────────
    atr_pct = calc_atr(highs_15m, lows_15m, closes_15m)
    lookback = min(8, len(closes_15m) - 1)
    if closes_15m[-lookback] > 0:
        move_pct = abs(closes_15m[-1] - closes_15m[-lookback]) / closes_15m[-lookback] * 100
        atr_multiple = move_pct / atr_pct if atr_pct > 0 else 0
        if atr_multiple > 2.5:
            direction = "LONG" if closes_15m[-1] > closes_15m[-lookback] else "SHORT"
            signals.append(("ATR Breakout", direction, min(85, atr_multiple * 20)))

    # ── Ensemble: compute consensus ───────────────────────────────────────────
    long_sigs = [(n, s) for n, d, s in signals if d == "LONG"]
    short_sigs = [(n, s) for n, d, s in signals if d == "SHORT"]

    if not long_sigs and not short_sigs:
        direction = "NEUTRAL"
        active = []
        strength = 0.0
    elif len(long_sigs) > len(short_sigs):
        direction = "LONG"
        active = long_sigs
    elif len(short_sigs) > len(long_sigs):
        direction = "SHORT"
        active = short_sigs
    else:
        # Tied — pick by total strength
        if sum(s for _, s in long_sigs) >= sum(s for _, s in short_sigs):
            direction = "LONG"
            active = long_sigs
        else:
            direction = "SHORT"
            active = short_sigs

    if active:
        n_active = len(active)
        total = sum(s for _, s in active)
        strength = round(total / (n_active + 1.5), 1)  # dampened average
        if n_active >= 3:
            strength = min(95, strength * 1.15)
        if n_active >= 4:
            strength = min(95, strength * 1.10)

    return {
        "direction": direction,
        "strength": round(strength if active else 0.0, 1),
        "confluence": len(active),
        "algo_count": len(signals),
        "algorithms": [{"name": name, "strength": round(s, 1)} for name, s in active],
        "all_signals": [
            {"name": nm, "direction": dr, "strength": round(st, 1)}
            for nm, dr, st in signals
        ],
        "reason": (
            f"{len(active)} {direction} signal{'s' if len(active) != 1 else ''}: "
            + ", ".join(name for name, _ in active[:3])
        ) if active else "No clear signal",
        "rsi_15m": rsi_15m,
        "rsi_1h": rsi_1h,
        "rsi_4h": rsi_4h,
        "atr_pct": atr_pct,
    }


def calc_leverage_params(
    price: float, atr_pct: float, capital_eur: float, risk_pct: float
) -> dict:
    """
    Calculate leverage, position size, TP/SL/liquidation prices.
    - Leverage inversely proportional to volatility
    - Position sized so max loss = capital * risk_pct
    - TP = 2× risk reward, SL = 1.5× ATR
    """
    if capital_eur <= 0 or price <= 0:
        return {}

    atr_safe = max(0.1, atr_pct)
    suggested_leverage = max(2, min(20, int(2.0 / atr_safe)))
    risk_eur = capital_eur * (risk_pct / 100)
    sl_pct = atr_safe * 1.5
    tp_pct = sl_pct * 2.0

    # Position size = risk_eur / stop_loss_fraction
    position_size_eur = risk_eur / (sl_pct / 100)

    # Cap margin at 30% of capital per trade
    margin_eur = position_size_eur / suggested_leverage
    if margin_eur > capital_eur * 0.30:
        margin_eur = capital_eur * 0.30
        position_size_eur = margin_eur * suggested_leverage

    liq_pct = round(0.90 / suggested_leverage * 100, 2)

    return {
        "suggested_leverage": suggested_leverage,
        "position_size_eur": round(position_size_eur, 2),
        "margin_eur": round(margin_eur, 2),
        "risk_eur": round(risk_eur, 2),
        "sl_pct": round(sl_pct, 2),
        "tp_pct": round(tp_pct, 2),
        "liq_pct": liq_pct,
        "entry_price": price,
        "tp_long": round(price * (1 + tp_pct / 100), 6),
        "sl_long": round(price * (1 - sl_pct / 100), 6),
        "tp_short": round(price * (1 - tp_pct / 100), 6),
        "sl_short": round(price * (1 + sl_pct / 100), 6),
        "liq_long": round(price * (1 - liq_pct / 100), 6),
        "liq_short": round(price * (1 + liq_pct / 100), 6),
    }


# ─── Main Service ─────────────────────────────────────────────────────────────

class IntradayService:
    SPOT = "https://api.binance.com"
    FUTURES = "https://fapi.binance.com"
    FEAR_GREED = "https://api.alternative.me/fng/?limit=1"
    COINGECKO = "https://api.coingecko.com/api/v3"

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._cache: dict = {}
        self._cache_ttl: int = 30  # seconds

    def _client_get(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=12.0)
        return self._client

    def _cache_get(self, key: str):
        entry = self._cache.get(key)
        if entry and time.time() - entry["t"] < self._cache_ttl:
            return entry["v"]
        return None

    def _cache_set(self, key: str, value):
        self._cache[key] = {"v": value, "t": time.time()}

    async def _get(self, url: str, params: dict = None):
        try:
            resp = await self._client_get().get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            logger.debug(f"GET {url} failed: {e}")
        return None

    # ── Market Pulse ──────────────────────────────────────────────────────────

    async def get_market_pulse(self) -> dict:
        cached = self._cache_get("pulse")
        if cached:
            return cached

        btc_data, fg_data, cg_data = await asyncio.gather(
            self._get(f"{self.SPOT}/api/v3/ticker/24hr", {"symbol": "BTCUSDT"}),
            self._get(self.FEAR_GREED),
            self._get(f"{self.COINGECKO}/global"),
            return_exceptions=True,
        )

        # Fear & Greed
        fg_val, fg_label = 50, "Neutral"
        if isinstance(fg_data, dict) and fg_data.get("data"):
            fg_val = int(fg_data["data"][0].get("value", 50))
            fg_label = fg_data["data"][0].get("value_classification", "Neutral")

        # BTC
        btc_price, btc_change = 0.0, 0.0
        if isinstance(btc_data, dict):
            btc_price = float(btc_data.get("lastPrice", 0))
            btc_change = float(btc_data.get("priceChangePercent", 0))

        # Global market
        btc_dom, total_mcap = 52.0, 2.5e12
        if isinstance(cg_data, dict) and cg_data.get("data"):
            gd = cg_data["data"]
            btc_dom = round(gd.get("market_cap_percentage", {}).get("btc", 52), 1)
            total_mcap = gd.get("total_market_cap", {}).get("usd", 2.5e12)

        result = {
            "btc_price": btc_price,
            "btc_change_24h": round(btc_change, 2),
            "fear_greed": fg_val,
            "fear_greed_label": fg_label,
            "btc_dominance": btc_dom,
            "total_market_cap_b": round(total_mcap / 1e9),
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._cache_set("pulse", result)
        return result

    # ── Klines ────────────────────────────────────────────────────────────────

    async def _fetch_klines(self, symbol: str, interval: str, limit: int = 100) -> dict:
        data = await self._get(
            f"{self.SPOT}/api/v3/klines",
            {"symbol": symbol, "interval": interval, "limit": limit},
        )
        if not isinstance(data, list) or not data:
            return {}
        return {
            "closes": [float(c[4]) for c in data],
            "highs": [float(c[2]) for c in data],
            "lows": [float(c[3]) for c in data],
            "volumes": [float(c[5]) for c in data],
        }

    # ── Funding Rates ─────────────────────────────────────────────────────────

    async def get_all_funding_rates(self) -> dict:
        cached = self._cache_get("funding")
        if cached:
            return cached
        data = await self._get(f"{self.FUTURES}/fapi/v1/premiumIndex")
        rates = {}
        if isinstance(data, list):
            for item in data:
                sym = item.get("symbol", "")
                rate = float(item.get("lastFundingRate", 0)) * 100  # as %
                rates[sym] = round(rate, 4)
        self._cache_set("funding", rates)
        return rates

    # ── Whale Feed ────────────────────────────────────────────────────────────

    async def get_whale_feed(self) -> list:
        cached = self._cache_get("whales")
        if cached:
            return cached

        watch_syms = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "AVAXUSDT"]
        whales = []

        async def fetch_trades(sym: str):
            data = await self._get(
                f"{self.SPOT}/api/v3/trades", {"symbol": sym, "limit": 200}
            )
            if isinstance(data, list):
                for t in data:
                    qty = float(t.get("qty", 0))
                    px = float(t.get("price", 0))
                    notional = qty * px
                    if notional >= 80_000:
                        whales.append({
                            "symbol": sym.replace("USDT", ""),
                            "side": "SELL" if t.get("isBuyerMaker") else "BUY",
                            "usd_value": round(notional),
                            "price": px,
                            "time": t.get("time", 0),
                        })

        await asyncio.gather(*[fetch_trades(s) for s in watch_syms], return_exceptions=True)
        whales.sort(key=lambda x: x["usd_value"], reverse=True)
        result = whales[:20]
        self._cache_set("whales", result)
        return result

    # ── Liquidations ──────────────────────────────────────────────────────────

    async def get_recent_liquidations(self) -> list:
        cached = self._cache_get("liquidations")
        if cached:
            return cached

        top_syms = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]
        liqs = []

        async def fetch_liq(sym: str):
            data = await self._get(
                f"{self.FUTURES}/fapi/v1/allForceOrders",
                {"symbol": sym, "limit": 20},
            )
            if isinstance(data, list):
                for item in data:
                    qty = float(item.get("origQty", 0))
                    px = float(item.get("price", 0))
                    notional = qty * px
                    if notional >= 5_000:
                        liqs.append({
                            "symbol": sym.replace("USDT", ""),
                            "side": item.get("side", ""),
                            "usd_value": round(notional),
                            "price": px,
                            "time": item.get("time", 0),
                        })

        await asyncio.gather(*[fetch_liq(s) for s in top_syms], return_exceptions=True)
        liqs.sort(key=lambda x: x["usd_value"], reverse=True)
        result = liqs[:20]
        self._cache_set("liquidations", result)
        return result

    # ── Main Signal Engine ────────────────────────────────────────────────────

    async def get_signals(
        self, capital_eur: float = 50.0, risk_pct: float = 2.0
    ) -> list:
        cache_key = f"signals_{int(capital_eur)}_{risk_pct}"
        cached = self._cache_get(cache_key)
        if cached:
            return cached

        # 1 call — all 24h tickers
        all_tickers_raw = await self._get(f"{self.SPOT}/api/v3/ticker/24hr")
        ticker_map: dict = {}
        if isinstance(all_tickers_raw, list):
            for t in all_tickers_raw:
                sym = t.get("symbol", "")
                if sym.endswith("USDT"):
                    ticker_map[sym] = t

        # 1 call — all funding rates
        funding_rates = await self.get_all_funding_rates()

        # Validate symbols, sort by 24h volume
        valid = [s for s in SPOT_SYMBOLS if s in ticker_map]
        valid.sort(
            key=lambda s: float(ticker_map[s].get("quoteVolume", 0)),
            reverse=True,
        )

        top_30 = valid[:30]
        rest = valid[30:]

        # Full analysis: 3 timeframes + all 8 algorithms
        async def analyze_full(symbol: str) -> Optional[dict]:
            try:
                t = ticker_map[symbol]
                price = float(t.get("lastPrice", 0))
                change_24h = float(t.get("priceChangePercent", 0))
                volume_24h = float(t.get("quoteVolume", 0))
                if price <= 0:
                    return None

                k15m, k1h, k4h = await asyncio.gather(
                    self._fetch_klines(symbol, "15m", 100),
                    self._fetch_klines(symbol, "1h", 60),
                    self._fetch_klines(symbol, "4h", 30),
                )
                if not k15m or not k15m.get("closes"):
                    return None

                funding = funding_rates.get(symbol, 0.0)
                # OI proxy: use volume-change correlation
                oi_change_pct = round(change_24h * 0.25, 2)

                sig = calc_signal_ensemble(
                    closes_15m=k15m["closes"],
                    closes_1h=k1h.get("closes", []),
                    closes_4h=k4h.get("closes", []),
                    highs_15m=k15m.get("highs", []),
                    lows_15m=k15m.get("lows", []),
                    volumes_15m=k15m.get("volumes", []),
                    funding_rate=funding,
                    oi_change_pct=oi_change_pct,
                )
                lev = calc_leverage_params(price, sig.get("atr_pct", 2.0), capital_eur, risk_pct)

                return {
                    "symbol": symbol.replace("USDT", ""),
                    "price": price,
                    "change_24h": round(change_24h, 2),
                    "volume_24h_m": round(volume_24h / 1e6, 1),
                    "funding_rate": funding,
                    "has_futures": symbol in FUTURES_SYMBOLS,
                    "full_analysis": True,
                    "signal": sig,
                    "leverage": lev,
                }
            except Exception as e:
                logger.debug(f"analyze_full {symbol}: {e}")
                return None

        # Lite analysis: 15m only + RSI
        async def analyze_lite(symbol: str) -> Optional[dict]:
            try:
                t = ticker_map[symbol]
                price = float(t.get("lastPrice", 0))
                change_24h = float(t.get("priceChangePercent", 0))
                volume_24h = float(t.get("quoteVolume", 0))
                if price <= 0:
                    return None

                k15m = await self._fetch_klines(symbol, "15m", 60)
                if not k15m or not k15m.get("closes"):
                    return None

                closes = k15m["closes"]
                rsi = calc_rsi(closes)
                direction, strength = "NEUTRAL", 0.0
                if rsi < 35:
                    direction, strength = "LONG", (35 - rsi) * 2.5
                elif rsi > 65:
                    direction, strength = "SHORT", (rsi - 65) * 2.5

                atr_pct = calc_atr(k15m.get("highs", []), k15m.get("lows", []), closes)
                lev = calc_leverage_params(price, atr_pct, capital_eur, risk_pct)

                return {
                    "symbol": symbol.replace("USDT", ""),
                    "price": price,
                    "change_24h": round(change_24h, 2),
                    "volume_24h_m": round(volume_24h / 1e6, 1),
                    "funding_rate": funding_rates.get(symbol, 0.0),
                    "has_futures": symbol in FUTURES_SYMBOLS,
                    "full_analysis": False,
                    "signal": {
                        "direction": direction,
                        "strength": round(strength, 1),
                        "confluence": 1 if direction != "NEUTRAL" else 0,
                        "algo_count": 1,
                        "algorithms": [{"name": "RSI", "strength": round(strength, 1)}]
                        if direction != "NEUTRAL" else [],
                        "all_signals": [],
                        "reason": f"RSI {rsi:.0f}",
                        "rsi_15m": rsi, "rsi_1h": 50.0, "rsi_4h": 50.0,
                        "atr_pct": atr_pct,
                    },
                    "leverage": lev,
                }
            except Exception as e:
                logger.debug(f"analyze_lite {symbol}: {e}")
                return None

        full_res, lite_res = await asyncio.gather(
            asyncio.gather(*[analyze_full(s) for s in top_30], return_exceptions=True),
            asyncio.gather(*[analyze_lite(s) for s in rest], return_exceptions=True),
        )

        results = []
        for r in list(full_res) + list(lite_res):
            if r and not isinstance(r, Exception):
                results.append(r)

        results.sort(key=lambda x: x["signal"]["strength"], reverse=True)
        self._cache_set(cache_key, results)
        return results

    async def get_funding_rates_list(self) -> list:
        rates = await self.get_all_funding_rates()
        result = [
            {"symbol": k.replace("USDT", ""), "rate": v}
            for k, v in rates.items()
            if k.endswith("USDT") and k.replace("USDT", "") != ""
        ]
        result.sort(key=lambda x: abs(x["rate"]), reverse=True)
        return result[:40]


# ─── Singleton ────────────────────────────────────────────────────────────────

_service: Optional[IntradayService] = None


def get_intraday_service() -> IntradayService:
    global _service
    if _service is None:
        _service = IntradayService()
    return _service
