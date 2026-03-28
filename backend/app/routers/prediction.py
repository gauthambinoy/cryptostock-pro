"""
AI Price Prediction API endpoints
Uses technical analysis: RSI, SMA, EMA, MACD, Bollinger Bands, Volume, Momentum
Also provides ML-based prediction using scikit-learn (Random Forest ensemble).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service
import yfinance as yf
from math import sqrt
import logging

logger = logging.getLogger(__name__)

# Optional scikit-learn import with graceful fallback
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. ML prediction endpoint will be unavailable.")

router = APIRouter(prefix="/api/prediction", tags=["AI Prediction"])


def _ema(prices, period):
    """Calculate Exponential Moving Average"""
    if len(prices) < period:
        return prices[:]
    multiplier = 2 / (period + 1)
    ema_values = [sum(prices[:period]) / period]
    for price in prices[period:]:
        ema_values.append((price - ema_values[-1]) * multiplier + ema_values[-1])
    return ema_values


def _sma(prices, period):
    """Calculate Simple Moving Average"""
    if len(prices) < period:
        return []
    return [sum(prices[i:i+period]) / period for i in range(len(prices) - period + 1)]


def _rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    if len(prices) < period + 1:
        return 50  # neutral default

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

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(prices):
    """Calculate MACD (12-EMA minus 26-EMA) and signal line (9-EMA of MACD)"""
    if len(prices) < 26:
        return 0, 0

    ema12 = _ema(prices, 12)
    ema26 = _ema(prices, 26)

    # Align lengths
    diff = len(ema12) - len(ema26)
    ema12 = ema12[diff:]

    macd_line = [a - b for a, b in zip(ema12, ema26)]

    if len(macd_line) < 9:
        return macd_line[-1] if macd_line else 0, 0

    signal = _ema(macd_line, 9)

    return macd_line[-1], signal[-1] if signal else 0


def _bollinger_bands(prices, period=20, num_std=2):
    """Calculate Bollinger Bands"""
    if len(prices) < period:
        return None, None, None

    sma = sum(prices[-period:]) / period
    variance = sum((p - sma) ** 2 for p in prices[-period:]) / period
    std = sqrt(variance) if variance > 0 else 0

    upper = sma + num_std * std
    lower = sma - num_std * std

    return upper, sma, lower


# ---------------------------------------------------------------------------
# ML Prediction helpers
# ---------------------------------------------------------------------------

def _build_features(prices: list[float]) -> tuple[list[list[float]], list[float]]:
    """
    Build feature matrix from price history.

    Features per row:
        0: day_of_week  (position mod 5, proxy without dates)
        1: day_of_month (position mod 22)
        2: SMA-5  (normalised to current price)
        3: SMA-10 (normalised)
        4: SMA-20 (normalised)
        5: momentum_5d  (% change over 5 days)
        6: momentum_10d (% change over 10 days)
        7: volatility   (10-day rolling std, normalised)
        8: RSI-14

    Target: next-day price (shift by 1).
    """
    X = []
    y = []
    min_lookback = 20

    for i in range(min_lookback, len(prices) - 1):
        window = prices[: i + 1]
        cur = prices[i]

        sma5 = sum(window[-5:]) / 5
        sma10 = sum(window[-10:]) / 10
        sma20 = sum(window[-20:]) / 20

        mom5 = ((cur - window[-6]) / window[-6]) * 100 if len(window) >= 6 and window[-6] != 0 else 0
        mom10 = ((cur - window[-11]) / window[-11]) * 100 if len(window) >= 11 and window[-11] != 0 else 0

        seg = window[-10:]
        seg_mean = sum(seg) / len(seg)
        vol = sqrt(sum((p - seg_mean) ** 2 for p in seg) / len(seg))

        rsi_val = _rsi(window, 14)

        day_of_week = i % 5
        day_of_month = i % 22

        row = [
            day_of_week,
            day_of_month,
            sma5 / cur if cur else 1,
            sma10 / cur if cur else 1,
            sma20 / cur if cur else 1,
            mom5,
            mom10,
            vol / cur if cur else 0,
            rsi_val,
        ]
        X.append(row)
        y.append(prices[i + 1])

    return X, y


def _run_ml_prediction(prices: list[float], current_price: float) -> dict | None:
    """
    Train a Random Forest on historical price features and predict the next
    7 days.  Returns prediction dict or None on failure.
    """
    if not SKLEARN_AVAILABLE:
        return None
    if len(prices) < 30:
        return None

    X, y = _build_features(prices)
    if len(X) < 10:
        return None

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled, y)

    # Iteratively predict next 7 days
    predicted_prices = []
    sim_prices = list(prices)

    for day_offset in range(1, 8):
        idx = len(sim_prices) - 1
        cur = sim_prices[-1]

        sma5 = sum(sim_prices[-5:]) / 5
        sma10 = sum(sim_prices[-10:]) / 10
        sma20 = sum(sim_prices[-20:]) / 20

        mom5 = ((cur - sim_prices[-6]) / sim_prices[-6]) * 100 if len(sim_prices) >= 6 and sim_prices[-6] != 0 else 0
        mom10 = ((cur - sim_prices[-11]) / sim_prices[-11]) * 100 if len(sim_prices) >= 11 and sim_prices[-11] != 0 else 0

        seg = sim_prices[-10:]
        seg_mean = sum(seg) / len(seg)
        vol = sqrt(sum((p - seg_mean) ** 2 for p in seg) / len(seg))

        rsi_val = _rsi(sim_prices, 14)

        row = [
            (idx + day_offset) % 5,
            (idx + day_offset) % 22,
            sma5 / cur if cur else 1,
            sma10 / cur if cur else 1,
            sma20 / cur if cur else 1,
            mom5,
            mom10,
            vol / cur if cur else 0,
            rsi_val,
        ]
        row_scaled = scaler.transform([row])
        pred = model.predict(row_scaled)[0]
        predicted_prices.append(round(pred, 2))
        sim_prices.append(pred)

    last_predicted = predicted_prices[-1]
    change_pct = ((last_predicted - current_price) / current_price) * 100 if current_price else 0

    if change_pct > 1:
        direction = "up"
    elif change_pct < -1:
        direction = "down"
    else:
        direction = "sideways"

    # Model confidence from training R-squared (capped 0.30 - 0.95)
    train_preds = model.predict(X_scaled)
    ss_res = sum((actual - pred) ** 2 for actual, pred in zip(y, train_preds))
    y_mean = sum(y) / len(y)
    ss_tot = sum((actual - y_mean) ** 2 for actual in y)
    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    confidence = max(0.30, min(0.95, r2))

    return {
        "predicted_prices": predicted_prices,
        "predicted_direction": direction,
        "predicted_change_percent": round(change_pct, 2),
        "model_confidence": round(confidence, 4),
    }


# ---------------------------------------------------------------------------
# Endpoints (ML endpoint first so FastAPI matches /{symbol}/ml before /{symbol})
# ---------------------------------------------------------------------------

@router.get("/{symbol}/ml")
async def get_ml_prediction(
    symbol: str,
    asset_type: str = "stock",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    ML-based price prediction using a scikit-learn Random Forest ensemble.

    Returns 7-day predicted prices, direction, expected change %, and model
    confidence score.
    """
    if not SKLEARN_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="scikit-learn is not installed. ML prediction is unavailable.",
        )

    symbol = symbol.upper()
    market_service = get_market_service()

    prices: list[float] = []
    current_price: float = 0

    if asset_type == "crypto":
        quote = await market_service.get_crypto_quote(symbol)
        history = await market_service.get_crypto_history(symbol, 90)
        if history:
            prices = [h["price"] for h in history]
        if quote:
            current_price = quote.price
    else:
        quote = market_service.get_stock_quote(symbol)
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="3mo")
            if len(hist) > 0:
                prices = hist["Close"].tolist()
        except Exception:
            pass
        if quote:
            current_price = quote.price

    if not prices or len(prices) < 30:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient historical data for ML prediction on {symbol} (need >= 30 days, got {len(prices)}).",
        )

    if not current_price and prices:
        current_price = prices[-1]

    result = _run_ml_prediction(prices, current_price)
    if result is None:
        raise HTTPException(
            status_code=500,
            detail="ML model training failed. Try again later.",
        )

    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "current_price": round(current_price, 2),
        "model": "RandomForest (scikit-learn)",
        "features": [
            "day_of_week", "day_of_month",
            "SMA-5", "SMA-10", "SMA-20",
            "momentum_5d", "momentum_10d",
            "volatility_10d", "RSI-14",
        ],
        "predicted_prices_7d": result["predicted_prices"],
        "predicted_direction": result["predicted_direction"],
        "predicted_change_percent": result["predicted_change_percent"],
        "model_confidence": result["model_confidence"],
        "disclaimer": "ML predictions are experimental and should not be used as financial advice.",
    }


@router.get("/{symbol}")
async def get_prediction(
    symbol: str,
    asset_type: str = "stock",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    symbol = symbol.upper()
    market_service = get_market_service()

    # Get historical prices
    prices = []
    volumes = []
    current_price = 0

    if asset_type == "crypto":
        quote = await market_service.get_crypto_quote(symbol)
        history = await market_service.get_crypto_history(symbol, 90)
        if history:
            prices = [h["price"] for h in history]
        if quote:
            current_price = quote.price
    else:
        quote = market_service.get_stock_quote(symbol)
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="3mo")
            if len(hist) > 0:
                prices = hist["Close"].tolist()
                volumes = hist["Volume"].tolist()
        except:
            pass
        if quote:
            current_price = quote.price

    if not prices or len(prices) < 20:
        raise HTTPException(status_code=400, detail=f"Insufficient data for {symbol}")

    if not current_price and prices:
        current_price = prices[-1]

    score = 0
    reasons = []

    # 1. RSI Analysis
    rsi_val = _rsi(prices)
    if rsi_val < 30:
        score += 2
        reasons.append(f"RSI ({rsi_val:.1f}) indicates OVERSOLD - Strong bullish signal")
    elif rsi_val < 40:
        score += 1
        reasons.append(f"RSI ({rsi_val:.1f}) approaching oversold territory - Mild bullish")
    elif rsi_val > 70:
        score -= 2
        reasons.append(f"RSI ({rsi_val:.1f}) indicates OVERBOUGHT - Strong bearish signal")
    elif rsi_val > 60:
        score -= 1
        reasons.append(f"RSI ({rsi_val:.1f}) approaching overbought territory - Mild bearish")
    else:
        reasons.append(f"RSI ({rsi_val:.1f}) is neutral")

    # 2. SMA Crossover (20 vs 50)
    sma20 = _sma(prices, 20)
    sma50 = _sma(prices, 50)
    if sma20 and sma50:
        if sma20[-1] > sma50[-1]:
            score += 1
            reasons.append(f"SMA20 ({sma20[-1]:.2f}) above SMA50 ({sma50[-1]:.2f}) - Golden cross (bullish)")
        else:
            score -= 1
            reasons.append(f"SMA20 ({sma20[-1]:.2f}) below SMA50 ({sma50[-1]:.2f}) - Death cross (bearish)")

    # 3. MACD
    macd_val, signal_val = _macd(prices)
    if macd_val > signal_val:
        score += 1
        reasons.append(f"MACD ({macd_val:.4f}) above signal ({signal_val:.4f}) - Bullish momentum")
    else:
        score -= 1
        reasons.append(f"MACD ({macd_val:.4f}) below signal ({signal_val:.4f}) - Bearish momentum")

    # 4. Bollinger Bands
    upper, middle, lower = _bollinger_bands(prices)
    if upper and lower:
        if current_price <= lower:
            score += 2
            reasons.append(f"Price near lower Bollinger Band (${lower:.2f}) - Potential bounce (bullish)")
        elif current_price >= upper:
            score -= 2
            reasons.append(f"Price near upper Bollinger Band (${upper:.2f}) - Potential pullback (bearish)")
        else:
            band_pos = (current_price - lower) / (upper - lower) if (upper - lower) > 0 else 0.5
            if band_pos < 0.3:
                score += 1
                reasons.append(f"Price in lower Bollinger zone ({band_pos:.0%}) - Mild bullish")
            elif band_pos > 0.7:
                score -= 1
                reasons.append(f"Price in upper Bollinger zone ({band_pos:.0%}) - Mild bearish")
            else:
                reasons.append(f"Price in middle Bollinger zone ({band_pos:.0%}) - Neutral")

    # 5. Volume Trend
    if volumes and len(volumes) >= 20:
        recent_vol = sum(volumes[-5:]) / 5
        avg_vol = sum(volumes[-20:]) / 20
        price_up = prices[-1] > prices[-5] if len(prices) >= 5 else False

        if recent_vol > avg_vol * 1.5 and price_up:
            score += 1
            reasons.append(f"Volume surge ({recent_vol/avg_vol:.1f}x avg) with price increase - Bullish confirmation")
        elif recent_vol > avg_vol * 1.5 and not price_up:
            score -= 1
            reasons.append(f"Volume surge ({recent_vol/avg_vol:.1f}x avg) with price decrease - Bearish pressure")
        else:
            reasons.append(f"Volume normal ({recent_vol/avg_vol:.1f}x avg)")

    # 6. Price Momentum (10-day ROC)
    if len(prices) >= 10:
        roc = ((prices[-1] - prices[-10]) / prices[-10]) * 100 if prices[-10] != 0 else 0
        if roc > 5:
            score += 1
            reasons.append(f"10-day momentum: +{roc:.1f}% - Strong upward momentum")
        elif roc > 2:
            score += 1
            reasons.append(f"10-day momentum: +{roc:.1f}% - Positive momentum")
        elif roc < -5:
            score -= 1
            reasons.append(f"10-day momentum: {roc:.1f}% - Strong downward momentum")
        elif roc < -2:
            score -= 1
            reasons.append(f"10-day momentum: {roc:.1f}% - Negative momentum")
        else:
            reasons.append(f"10-day momentum: {roc:+.1f}% - Sideways")

    # Determine signal
    if score >= 3:
        signal = "bullish"
        confidence = min(0.90, 0.50 + score * 0.08)
        direction = "up"
    elif score <= -3:
        signal = "bearish"
        confidence = min(0.90, 0.50 + abs(score) * 0.08)
        direction = "down"
    else:
        signal = "neutral"
        confidence = 0.40 + abs(score) * 0.05
        direction = "sideways"

    # Attempt to include ML prediction summary if sklearn is available
    ml_summary = None
    if SKLEARN_AVAILABLE:
        try:
            ml_result = _run_ml_prediction(prices, current_price)
            if ml_result:
                ml_summary = {
                    "predicted_direction": ml_result["predicted_direction"],
                    "predicted_change_percent": ml_result["predicted_change_percent"],
                    "model_confidence": ml_result["model_confidence"],
                }
        except Exception:
            pass

    return {
        "symbol": symbol,
        "signal": signal,
        "confidence": round(confidence, 2),
        "score": score,
        "reasons": reasons,
        "current_price": round(current_price, 2),
        "predicted_direction": direction,
        "indicators": {
            "rsi": round(rsi_val, 2),
            "macd": round(macd_val, 6),
            "macd_signal": round(signal_val, 6),
            "sma20": round(sma20[-1], 2) if sma20 else None,
            "sma50": round(sma50[-1], 2) if sma50 else None,
            "bollinger_upper": round(upper, 2) if upper else None,
            "bollinger_lower": round(lower, 2) if lower else None,
        },
        "ml_prediction": ml_summary,
    }
