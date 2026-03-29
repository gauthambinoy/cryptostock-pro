"""
Investment Analysis API - Core prediction platform endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.analysis_engine import get_analysis_engine

router = APIRouter(prefix="/api/invest", tags=["Investment Analysis"])


async def _analyze(engine, symbol, asset_type):
    """Helper to call correct analysis method and return dict."""
    if asset_type == "crypto":
        return await engine.analyze_crypto(symbol.upper())
    return await engine.analyze_stock(symbol.upper())


@router.get("/top-picks")
async def get_top_picks(
    asset_type: str = Query("all"),
    limit: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Top profitable investments today, ranked by profit potential."""
    engine = get_analysis_engine()
    picks = await engine.get_top_picks(asset_type=asset_type, limit=limit)
    return picks


@router.get("/market-pulse")
async def market_pulse(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Market overview: trend, fear/greed, summary."""
    engine = get_analysis_engine()
    return await engine.get_market_pulse()


@router.get("/analyze/{symbol}")
async def analyze_symbol(
    symbol: str,
    asset_type: str = Query("stock"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Full deep analysis for a single asset."""
    engine = get_analysis_engine()
    result = await _analyze(engine, symbol, asset_type)
    if not result:
        raise HTTPException(status_code=404, detail=f"Could not analyze {symbol}. Try again.")
    return result


@router.get("/profit-calc")
async def profit_calculator(
    symbol: str = Query(...),
    asset_type: str = Query("stock"),
    investment_amount: float = Query(..., gt=0),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Profit calculator: invest $X, expect $Y."""
    engine = get_analysis_engine()
    analysis = await _analyze(engine, symbol, asset_type)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Could not analyze {symbol}")

    pred = analysis.get("prediction", {})
    ret = pred.get("expected_return_pct", 5)
    conf = pred.get("confidence", 0.5)
    risk = pred.get("risk_level", "medium")
    signal = analysis.get("signal", "hold")

    short_ret = ret * 0.3
    med_ret = ret * 0.7
    long_ret = ret

    v_short = round(investment_amount * (1 + short_ret / 100), 2)
    v_med = round(investment_amount * (1 + med_ret / 100), 2)
    v_long = round(investment_amount * (1 + long_ret / 100), 2)

    if signal in ("strong_buy", "buy"):
        rec = f"BUY {symbol} - Expected {ret:+.1f}% return with {conf:.0%} confidence. {risk.title()} risk."
    elif signal in ("sell", "strong_sell"):
        rec = f"AVOID {symbol} - Bearish outlook. Wait for better entry."
    else:
        rec = f"HOLD/WAIT on {symbol} - Neutral. Monitor for clearer direction."

    return {
        "symbol": symbol.upper(), "asset_type": asset_type, "invested": investment_amount,
        "current_price": analysis.get("current_price", 0),
        "expected_value_short": v_short, "expected_value_medium": v_med, "expected_value_long": v_long,
        "expected_profit_short": round(v_short - investment_amount, 2),
        "expected_profit_medium": round(v_med - investment_amount, 2),
        "expected_profit_long": round(v_long - investment_amount, 2),
        "expected_return_pct": round(ret, 2), "expected_return_short": round(short_ret, 2),
        "expected_return_long": round(long_ret, 2),
        "confidence": conf, "risk_level": risk, "signal": signal,
        "stop_loss": pred.get("stop_loss", 0),
        "target_short": pred.get("target_short", 0), "target_medium": pred.get("target_medium", 0),
        "target_long": pred.get("target_long", 0),
        "recommendation": rec,
    }


@router.get("/compare")
async def compare_assets(
    symbols: str = Query(..., description="Comma-separated, e.g. AAPL,MSFT,BTC"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Compare 2-5 assets side by side."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 symbols")
    if len(symbol_list) > 5:
        raise HTTPException(status_code=400, detail="Max 5 symbols")

    engine = get_analysis_engine()
    crypto_set = set(engine.CRYPTO_IDS.keys())
    results = []
    for sym in symbol_list:
        at = "crypto" if sym in crypto_set else "stock"
        try:
            a = await _analyze(engine, sym, at)
            results.append(a or {"symbol": sym, "error": "Analysis failed"})
        except:
            results.append({"symbol": sym, "error": "Analysis failed"})
    return results


@router.get("/when-to-buy/{symbol}")
async def when_to_buy(
    symbol: str,
    asset_type: str = Query("stock"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Optimal entry point analysis."""
    engine = get_analysis_engine()
    analysis = await _analyze(engine, symbol, asset_type)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Could not analyze {symbol}")

    price = analysis["current_price"]
    pred = analysis.get("prediction", {})
    tech = analysis.get("technical", {})
    signal = analysis.get("signal", "hold")
    conf = pred.get("confidence", 0.5)
    stop = pred.get("stop_loss", price * 0.92)

    # Support = stop loss area, Resistance = target area
    support = round(stop, 2)
    resistance = round(pred.get("target_medium", price * 1.1), 2)

    is_good = signal in ("strong_buy", "buy") and conf >= 0.5
    entry = round(price * 0.98, 2) if not is_good else price

    if is_good:
        rec = f"{symbol} is a BUY at ${price:.2f}. Score: {analysis['overall_score']}/100, Confidence: {conf:.0%}. Stop loss at ${stop:.2f}."
    elif signal in ("sell", "strong_sell"):
        rec = f"AVOID {symbol} now. Wait for price to drop to ${support:.2f} support or a signal reversal."
    else:
        rec = f"{symbol} is neutral. Wait for a pullback to ${entry:.2f} or a confirmed breakout above ${resistance:.2f}."

    return {
        "symbol": symbol.upper(), "current_price": price,
        "support_levels": [support, round(support * 0.95, 2)],
        "resistance_levels": [resistance, round(resistance * 1.05, 2)],
        "optimal_entry_price": entry if not is_good else price,
        "is_good_time_to_buy": is_good,
        "wait_for_price": None if is_good else entry,
        "overall_score": analysis["overall_score"], "signal": signal,
        "recommendation_text": rec,
    }


@router.get("/when-to-sell/{symbol}")
async def when_to_sell(
    symbol: str,
    asset_type: str = Query("stock"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Exit strategy with targets and stop-loss."""
    engine = get_analysis_engine()
    analysis = await _analyze(engine, symbol, asset_type)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Could not analyze {symbol}")

    price = analysis["current_price"]
    pred = analysis.get("prediction", {})
    risk = pred.get("risk_level", "medium")
    stop = pred.get("stop_loss", round(price * 0.92, 2))
    t_short = pred.get("target_short", round(price * 1.05, 2))
    t_med = pred.get("target_medium", round(price * 1.12, 2))
    t_long = pred.get("target_long", round(price * 1.25, 2))

    trailing = 5.0 if risk == "high" else (8.0 if risk == "medium" else 12.0)

    take_profits = [
        {"level": "25%", "price": t_short},
        {"level": "50%", "price": round((t_short + t_med) / 2, 2)},
        {"level": "75%", "price": t_med},
        {"level": "100%", "price": t_long},
    ]

    signal = analysis.get("signal", "hold")
    if signal in ("strong_buy", "buy"):
        rec = f"HOLD {symbol}. Target ${t_med:.2f} (medium-term). Take partial profits at ${t_short:.2f}. Stop: ${stop:.2f}."
    elif signal in ("sell", "strong_sell"):
        rec = f"SELL {symbol} or set tight stop at ${stop:.2f}. Bearish outlook."
    else:
        rec = f"Hold {symbol} with stop at ${stop:.2f}. Scale out at targets if price moves up."

    return {
        "symbol": symbol.upper(), "current_price": price,
        "target_prices": {"short": t_short, "medium": t_med, "long": t_long},
        "stop_loss": stop, "trailing_stop_pct": trailing,
        "take_profit_levels": take_profits, "risk_level": risk,
        "recommendation_text": rec,
    }
