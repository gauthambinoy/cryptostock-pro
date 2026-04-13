"""
Options Analysis Service
Black-Scholes pricing, Greeks calculation, options chain generation,
and unusual activity detection.
"""
import math
import random
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Literal
from scipy.stats import norm

import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Black-Scholes core
# ---------------------------------------------------------------------------

def _d1(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Calculate d1 in the Black-Scholes formula."""
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    return (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))


def _d2(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Calculate d2 in the Black-Scholes formula."""
    if T <= 0 or sigma <= 0:
        return 0.0
    return _d1(S, K, T, r, sigma) - sigma * math.sqrt(T)


def calculate_option_price(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: Literal["call", "put"] = "call",
) -> float:
    """
    Black-Scholes option price.
    S     – spot price
    K     – strike price
    T     – time to expiration in years
    r     – risk-free rate (annualised, e.g. 0.05 for 5%)
    sigma – volatility (annualised)
    """
    if T <= 0:
        # At expiration
        if option_type == "call":
            return max(S - K, 0.0)
        return max(K - S, 0.0)

    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(S, K, T, r, sigma)

    if option_type == "call":
        price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    return round(price, 4)


def calculate_greeks(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: Literal["call", "put"] = "call",
) -> Dict[str, float]:
    """
    Return Delta, Gamma, Theta, Vega, Rho for a European option.
    """
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return {"delta": 1.0 if intrinsic > 0 else 0.0,
                "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}

    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(S, K, T, r, sigma)
    sqrt_T = math.sqrt(T)
    pdf_d1 = norm.pdf(d1)
    discount = math.exp(-r * T)

    # Delta
    if option_type == "call":
        delta = norm.cdf(d1)
    else:
        delta = norm.cdf(d1) - 1.0

    # Gamma (same for calls and puts)
    gamma = pdf_d1 / (S * sigma * sqrt_T)

    # Theta (per calendar day)
    term1 = -(S * pdf_d1 * sigma) / (2 * sqrt_T)
    if option_type == "call":
        term2 = -r * K * discount * norm.cdf(d2)
        theta = (term1 + term2) / 365.0
    else:
        term2 = r * K * discount * norm.cdf(-d2)
        theta = (term1 + term2) / 365.0

    # Vega (per 1% move in vol)
    vega = S * sqrt_T * pdf_d1 / 100.0

    # Rho (per 1% move in rate)
    if option_type == "call":
        rho = K * T * discount * norm.cdf(d2) / 100.0
    else:
        rho = -K * T * discount * norm.cdf(-d2) / 100.0

    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
    }


def calculate_implied_volatility(
    market_price: float, S: float, K: float, T: float, r: float,
    option_type: Literal["call", "put"] = "call",
    tol: float = 1e-6, max_iter: int = 100,
) -> Optional[float]:
    """
    Newton-Raphson solver for implied volatility.
    Returns annualised IV or None if it fails to converge.
    """
    if T <= 0 or market_price <= 0:
        return None

    sigma = 0.3  # initial guess

    for _ in range(max_iter):
        price = calculate_option_price(S, K, T, r, sigma, option_type)
        diff = price - market_price

        if abs(diff) < tol:
            return round(sigma, 6)

        # Vega (not divided by 100)
        d1 = _d1(S, K, T, r, sigma)
        vega = S * math.sqrt(T) * norm.pdf(d1)

        if vega < 1e-12:
            break

        sigma -= diff / vega

        if sigma <= 0.001:
            sigma = 0.001

    return round(sigma, 6) if sigma > 0 else None


# ---------------------------------------------------------------------------
# Deterministic random helper (seed by symbol + date for consistency)
# ---------------------------------------------------------------------------

def _seeded_random(symbol: str, salt: str = "") -> random.Random:
    """Return a Random instance seeded on symbol + today's date + salt."""
    seed_str = f"{symbol}-{datetime.utcnow().strftime('%Y-%m-%d')}-{salt}"
    seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16) % (2**31)
    return random.Random(seed_int)


def _base_price(symbol: str) -> float:
    """Generate a plausible stock price from symbol name (deterministic)."""
    rng = _seeded_random(symbol, "price")
    well_known = {
        "AAPL": 185, "MSFT": 420, "GOOGL": 155, "AMZN": 185,
        "TSLA": 175, "NVDA": 880, "META": 500, "NFLX": 620,
        "SPY": 520, "QQQ": 440, "AMD": 160, "INTC": 32,
        "BA": 185, "DIS": 115, "JPM": 200, "V": 280,
    }
    return well_known.get(symbol.upper(), round(rng.uniform(20, 500), 2))


# ---------------------------------------------------------------------------
# Options chain generation
# ---------------------------------------------------------------------------

def generate_expiration_dates() -> List[str]:
    """Generate realistic expiration dates: weekly for 6 weeks, then monthly for 6 months."""
    today = datetime.utcnow().date()
    expirations = []

    # Find next Friday
    days_to_friday = (4 - today.weekday()) % 7
    if days_to_friday == 0:
        days_to_friday = 7
    next_friday = today + timedelta(days=days_to_friday)

    # Weekly expirations (6 weeks)
    for i in range(6):
        exp = next_friday + timedelta(weeks=i)
        expirations.append(exp.isoformat())

    # Monthly expirations (third Friday of each month for next 6 months)
    current_month = today.month
    current_year = today.year
    for m_offset in range(2, 8):
        month = ((current_month - 1 + m_offset) % 12) + 1
        year = current_year + ((current_month - 1 + m_offset) // 12)
        # Find third Friday
        first_day = datetime(year, month, 1).date()
        first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
        third_friday = first_friday + timedelta(weeks=2)
        exp_str = third_friday.isoformat()
        if exp_str not in expirations:
            expirations.append(exp_str)

    return sorted(expirations)


def generate_options_chain(
    symbol: str,
    expiration_date: str,
    option_type: str = "all",
    spot_price: Optional[float] = None,
) -> Dict:
    """
    Generate a realistic options chain for *symbol* at the given expiration.
    Returns calls, puts, and metadata.
    """
    S = spot_price or _base_price(symbol)
    rng = _seeded_random(symbol, expiration_date)

    exp_date = datetime.strptime(expiration_date, "%Y-%m-%d").date()
    today = datetime.utcnow().date()
    T = max((exp_date - today).days, 1) / 365.0
    r = 0.05  # risk-free rate

    # Generate strikes at $2.50 or $5 intervals depending on price
    interval = 2.5 if S < 100 else 5.0
    num_strikes = 15  # each side of ATM
    atm_strike = round(S / interval) * interval
    strikes = [atm_strike + interval * i for i in range(-num_strikes, num_strikes + 1)]
    strikes = [s for s in strikes if s > 0]

    calls = []
    puts = []

    for K in strikes:
        # Generate a per-strike IV with smile
        moneyness = abs(math.log(S / K)) if K > 0 else 0
        base_iv = rng.uniform(0.20, 0.45)
        iv = base_iv + 0.15 * moneyness  # volatility smile
        iv = min(iv, 1.5)

        for opt_type in ["call", "put"]:
            price = calculate_option_price(S, K, T, r, iv, opt_type)
            greeks = calculate_greeks(S, K, T, r, iv, opt_type)

            # Synthetic market data
            spread_pct = rng.uniform(0.02, 0.10)
            half_spread = price * spread_pct / 2
            bid = round(max(price - half_spread, 0.01), 2)
            ask = round(price + half_spread, 2)
            last = round(rng.uniform(bid, ask), 2)

            oi = int(rng.gauss(2000, 1500))
            oi = max(oi, 10)
            vol_ratio = rng.uniform(0.3, 4.5)
            volume = max(int(oi * vol_ratio), 0)

            itm = (opt_type == "call" and S > K) or (opt_type == "put" and K > S)

            row = {
                "strike": K,
                "last": last,
                "bid": bid,
                "ask": ask,
                "volume": volume,
                "open_interest": oi,
                "iv": round(iv * 100, 2),  # percentage
                "delta": greeks["delta"],
                "gamma": greeks["gamma"],
                "theta": greeks["theta"],
                "vega": greeks["vega"],
                "rho": greeks["rho"],
                "itm": itm,
                "theoretical_price": round(price, 2),
            }

            if opt_type == "call":
                calls.append(row)
            else:
                puts.append(row)

    result: Dict = {
        "symbol": symbol.upper(),
        "spot_price": S,
        "expiration_date": expiration_date,
        "days_to_expiry": max((exp_date - today).days, 1),
        "risk_free_rate": r,
    }

    if option_type in ("all", "call"):
        result["calls"] = calls
    if option_type in ("all", "put"):
        result["puts"] = puts

    return result


# ---------------------------------------------------------------------------
# Unusual activity detection
# ---------------------------------------------------------------------------

_WATCHLIST_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
    "AMD", "INTC", "BA", "DIS", "JPM", "V", "SPY", "QQQ",
]


def detect_unusual_activity(limit: int = 30) -> List[Dict]:
    """Scan synthetic options data for unusual volume/OI ratios and block trades."""
    alerts: List[Dict] = []
    rng = _seeded_random("unusual", "activity")
    expirations = generate_expiration_dates()[:4]

    for symbol in _WATCHLIST_SYMBOLS:
        S = _base_price(symbol)
        for _ in range(rng.randint(1, 4)):
            opt_type = rng.choice(["call", "put"])
            exp = rng.choice(expirations)
            interval = 2.5 if S < 100 else 5.0
            strike = round(S / interval) * interval + interval * rng.randint(-5, 5)
            if strike <= 0:
                strike = interval

            oi = rng.randint(200, 8000)
            vol_oi_ratio = rng.uniform(0.5, 8.0)
            volume = int(oi * vol_oi_ratio)

            is_unusual = vol_oi_ratio > 3.0
            is_block = volume > 5000
            is_sweep = rng.random() < 0.2

            if not (is_unusual or is_block or is_sweep):
                continue

            premium = round(rng.uniform(0.5, 25.0), 2)
            notional = round(volume * premium * 100, 2)
            itm = (opt_type == "call" and S > strike) or (opt_type == "put" and strike > S)

            sentiment = "bullish" if opt_type == "call" else "bearish"
            if opt_type == "put" and rng.random() < 0.3:
                sentiment = "bullish"  # protective put

            flags = []
            if is_unusual:
                flags.append("high_vol_oi")
            if is_block:
                flags.append("block_trade")
            if is_sweep:
                flags.append("sweep")

            alerts.append({
                "symbol": symbol,
                "strike": strike,
                "expiration": exp,
                "option_type": opt_type,
                "volume": volume,
                "open_interest": oi,
                "vol_oi_ratio": round(vol_oi_ratio, 2),
                "premium": premium,
                "notional_value": notional,
                "sentiment": sentiment,
                "flags": flags,
                "itm": itm,
                "spot_price": S,
                "timestamp": datetime.utcnow().isoformat(),
            })

    # Sort by vol/OI ratio descending
    alerts.sort(key=lambda x: x["vol_oi_ratio"], reverse=True)
    return alerts[:limit]


# ---------------------------------------------------------------------------
# IV Surface
# ---------------------------------------------------------------------------

def generate_iv_surface(symbol: str) -> Dict:
    """
    Build an IV surface grid: strike vs expiration.
    Returns a matrix suitable for heatmap rendering.
    """
    S = _base_price(symbol)
    rng = _seeded_random(symbol, "ivsurface")
    expirations = generate_expiration_dates()[:8]
    today = datetime.utcnow().date()

    interval = 5.0 if S >= 100 else 2.5
    atm = round(S / interval) * interval
    strikes = [atm + interval * i for i in range(-8, 9)]
    strikes = [s for s in strikes if s > 0]

    surface: List[Dict] = []

    for exp_str in expirations:
        exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
        T = max((exp_date - today).days, 1) / 365.0

        for K in strikes:
            moneyness = math.log(S / K) if K > 0 else 0
            base_iv = 0.25 + 0.10 * abs(moneyness) + 0.05 * (1 / (T + 0.01))
            noise = rng.uniform(-0.03, 0.03)
            iv = max(base_iv + noise, 0.05)

            surface.append({
                "strike": K,
                "expiration": exp_str,
                "days_to_expiry": max((exp_date - today).days, 1),
                "iv": round(iv * 100, 2),
            })

    return {
        "symbol": symbol.upper(),
        "spot_price": S,
        "strikes": strikes,
        "expirations": expirations,
        "surface": surface,
    }


# ---------------------------------------------------------------------------
# Put/Call ratio
# ---------------------------------------------------------------------------

def calculate_put_call_ratio(symbol: str) -> Dict:
    """Compute put/call ratio from synthetic chain data."""
    S = _base_price(symbol)
    rng = _seeded_random(symbol, "pcr")
    expirations = generate_expiration_dates()[:4]

    total_call_vol = 0
    total_put_vol = 0
    total_call_oi = 0
    total_put_oi = 0

    for exp in expirations:
        chain = generate_options_chain(symbol, exp, "all", S)
        for c in chain.get("calls", []):
            total_call_vol += c["volume"]
            total_call_oi += c["open_interest"]
        for p in chain.get("puts", []):
            total_put_vol += p["volume"]
            total_put_oi += p["open_interest"]

    vol_ratio = round(total_put_vol / max(total_call_vol, 1), 4)
    oi_ratio = round(total_put_oi / max(total_call_oi, 1), 4)

    if vol_ratio < 0.7:
        sentiment = "bullish"
    elif vol_ratio > 1.3:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    return {
        "symbol": symbol.upper(),
        "spot_price": S,
        "put_call_volume_ratio": vol_ratio,
        "put_call_oi_ratio": oi_ratio,
        "total_call_volume": total_call_vol,
        "total_put_volume": total_put_vol,
        "total_call_oi": total_call_oi,
        "total_put_oi": total_put_oi,
        "sentiment": sentiment,
    }


# ---------------------------------------------------------------------------
# P&L calculator
# ---------------------------------------------------------------------------

def calculate_profit_loss(
    legs: List[Dict],
    spot_price: float,
    price_range_pct: float = 30,
    num_points: int = 200,
) -> Dict:
    """
    Calculate strategy P&L at expiration.
    Each leg: {strike, premium, quantity, option_type: "call"|"put", side: "buy"|"sell"}
    """
    low = spot_price * (1 - price_range_pct / 100)
    high = spot_price * (1 + price_range_pct / 100)
    step = (high - low) / num_points

    prices = []
    pnl_values = []

    for i in range(num_points + 1):
        price_at_exp = round(low + step * i, 2)
        total_pnl = 0.0

        for leg in legs:
            K = leg["strike"]
            prem = leg["premium"]
            qty = leg["quantity"]
            opt_type = leg["option_type"]
            side = leg.get("side", "buy")

            if opt_type == "call":
                intrinsic = max(price_at_exp - K, 0)
            else:
                intrinsic = max(K - price_at_exp, 0)

            if side == "buy":
                leg_pnl = (intrinsic - prem) * qty * 100
            else:
                leg_pnl = (prem - intrinsic) * qty * 100

            total_pnl += leg_pnl

        prices.append(price_at_exp)
        pnl_values.append(round(total_pnl, 2))

    # Calculate key metrics
    max_profit = max(pnl_values)
    max_loss = min(pnl_values)

    # Breakeven points (where PnL crosses zero)
    breakevens = []
    for i in range(len(pnl_values) - 1):
        if (pnl_values[i] <= 0 and pnl_values[i + 1] >= 0) or \
           (pnl_values[i] >= 0 and pnl_values[i + 1] <= 0):
            # Linear interpolation
            if pnl_values[i + 1] != pnl_values[i]:
                ratio = -pnl_values[i] / (pnl_values[i + 1] - pnl_values[i])
                be = prices[i] + ratio * step
                breakevens.append(round(be, 2))

    return {
        "spot_price": spot_price,
        "prices": prices,
        "pnl": pnl_values,
        "max_profit": max_profit if max_profit < 1e9 else "unlimited",
        "max_loss": max_loss if max_loss > -1e9 else "unlimited",
        "breakeven_points": breakevens,
        "legs": legs,
    }
