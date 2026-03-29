"""
Investment Analysis API - The main router for the investment prediction platform.

Provides endpoints for top picks, deep analysis, profit calculation,
market pulse, asset comparison, and entry/exit point recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.analysis_engine import get_analysis_engine
from dataclasses import asdict

router = APIRouter(prefix="/api/invest", tags=["Investment Analysis"])


@router.get("/top-picks")
async def get_top_picks(
    asset_type: str = Query("all", regex="^(all|stock|crypto)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    The killer endpoint. Returns the top most profitable investments to buy today,
    ranked by profit potential. Each item includes scoring, signal, expected return,
    confidence, risk level, and actionable targets.
    """
    engine = get_analysis_engine()
    all_picks = await engine.get_top_picks()

    if asset_type != "all":
        all_picks = [p for p in all_picks if p.asset_type == asset_type]

    # Sort by profit potential (expected_return_pct descending), take top N
    all_picks.sort(key=lambda p: p.expected_return_pct, reverse=True)
    top = all_picks[:limit]

    results = []
    for pick in top:
        results.append({
            "symbol": pick.symbol,
            "name": pick.name,
            "asset_type": pick.asset_type,
            "current_price": pick.current_price,
            "overall_score": pick.overall_score,
            "signal": pick.signal,
            "expected_return_pct": pick.expected_return_pct,
            "confidence": pick.confidence,
            "risk_level": pick.risk_level,
            "timeframe": pick.timeframe,
            "target_price": pick.target_price,
            "stop_loss": pick.stop_loss,
            "top_reasons": pick.top_reasons,
        })

    return results


@router.get("/analyze/{symbol}")
async def analyze_symbol(
    symbol: str,
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deep analysis for a single asset. Returns the full InvestmentAnalysis
    including all 5 analysis dimensions and the prediction.
    """
    engine = get_analysis_engine()
    symbol = symbol.upper()

    try:
        analysis = await engine.analyze(symbol, asset_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed for {symbol}: {str(e)}")

    if analysis is None:
        raise HTTPException(status_code=404, detail=f"No analysis available for {symbol}")

    return asdict(analysis)


@router.get("/profit-calc")
async def profit_calculator(
    symbol: str = Query(..., description="Asset symbol, e.g. AAPL or BTC"),
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    investment_amount: float = Query(..., gt=0, description="Amount in USD to invest"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Profit calculator. Given a symbol and investment amount, projects expected
    returns at short, medium, and long timeframes.
    """
    engine = get_analysis_engine()
    symbol = symbol.upper()

    try:
        analysis = await engine.analyze(symbol, asset_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed for {symbol}: {str(e)}")

    if analysis is None:
        raise HTTPException(status_code=404, detail=f"No analysis available for {symbol}")

    expected_return_pct = analysis.prediction.expected_return_pct
    confidence = analysis.prediction.confidence
    risk_level = analysis.prediction.risk_level

    # Project returns at different timeframes using the expected return
    # Short-term: ~25% of full expected move, Medium: ~60%, Long: 100%
    short_return_pct = expected_return_pct * 0.25
    medium_return_pct = expected_return_pct * 0.60
    long_return_pct = expected_return_pct

    expected_value_short = round(investment_amount * (1 + short_return_pct / 100), 2)
    expected_value_medium = round(investment_amount * (1 + medium_return_pct / 100), 2)
    expected_value_long = round(investment_amount * (1 + long_return_pct / 100), 2)

    expected_profit_short = round(expected_value_short - investment_amount, 2)
    expected_profit_medium = round(expected_value_medium - investment_amount, 2)
    expected_profit_long = round(expected_value_long - investment_amount, 2)

    signal = analysis.prediction.signal
    if signal == "bullish":
        recommendation = f"BUY {symbol} - Strong profit potential with {confidence:.0%} confidence."
    elif signal == "bearish":
        recommendation = f"AVOID {symbol} - Bearish outlook. Consider waiting for a better entry."
    else:
        recommendation = f"HOLD/WAIT on {symbol} - Neutral signal. Monitor for clearer direction."

    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "invested": investment_amount,
        "expected_value_short": expected_value_short,
        "expected_value_medium": expected_value_medium,
        "expected_value_long": expected_value_long,
        "expected_profit_short": expected_profit_short,
        "expected_profit_medium": expected_profit_medium,
        "expected_profit_long": expected_profit_long,
        "expected_return_pct": round(expected_return_pct, 2),
        "confidence": round(confidence, 4),
        "risk_level": risk_level,
        "recommendation": recommendation,
    }


@router.get("/market-pulse")
async def market_pulse(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Market overview dashboard data. Returns overall market trend, fear/greed index,
    top sectors, trending assets, and a human-readable market summary.
    """
    engine = get_analysis_engine()

    try:
        pulse = await engine.get_market_pulse()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market pulse: {str(e)}")

    # Determine market trend from S&P 500 analysis
    market_trend = pulse.get("market_trend", "neutral")
    fear_greed_index = pulse.get("fear_greed_index", 50)
    top_sectors = pulse.get("top_sectors", [])
    trending_assets = pulse.get("trending_assets", [])

    # Build summary text
    if market_trend == "bullish":
        trend_text = "Markets are trending BULLISH"
    elif market_trend == "bearish":
        trend_text = "Markets are trending BEARISH"
    else:
        trend_text = "Markets are in a NEUTRAL/SIDEWAYS phase"

    if fear_greed_index >= 75:
        sentiment_text = "Extreme Greed dominates sentiment - caution advised."
    elif fear_greed_index >= 55:
        sentiment_text = "Greed is driving the market - opportunities exist but watch for pullbacks."
    elif fear_greed_index >= 45:
        sentiment_text = "Sentiment is neutral - market is undecided."
    elif fear_greed_index >= 25:
        sentiment_text = "Fear is present - potential buying opportunities for contrarian investors."
    else:
        sentiment_text = "Extreme Fear - historically a strong buying signal for long-term investors."

    market_summary = f"{trend_text}. {sentiment_text}"
    if top_sectors:
        market_summary += f" Top performing sectors: {', '.join(top_sectors[:3])}."

    return {
        "market_trend": market_trend,
        "fear_greed_index": fear_greed_index,
        "top_sectors": top_sectors,
        "trending_assets": trending_assets,
        "market_summary": market_summary,
    }


@router.get("/compare")
async def compare_assets(
    symbols: str = Query(
        ...,
        description="Comma-separated symbols to compare, e.g. AAPL,MSFT,BTC (2-5 assets)",
    ),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare 2-5 assets side by side. Returns full analysis for each symbol.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 symbols to compare.")
    if len(symbol_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 symbols allowed for comparison.")

    engine = get_analysis_engine()
    results = []

    for sym in symbol_list:
        # Auto-detect asset type: well-known crypto symbols default to crypto
        crypto_symbols = {
            "BTC", "ETH", "BNB", "XRP", "ADA", "DOGE", "SOL", "DOT",
            "MATIC", "SHIB", "LTC", "AVAX", "LINK", "UNI", "ATOM",
        }
        asset_type = "crypto" if sym in crypto_symbols else "stock"

        try:
            analysis = await engine.analyze(sym, asset_type)
            if analysis is not None:
                results.append(asdict(analysis))
            else:
                results.append({"symbol": sym, "error": "No analysis available"})
        except Exception as e:
            results.append({"symbol": sym, "error": str(e)})

    return results


@router.get("/when-to-buy/{symbol}")
async def when_to_buy(
    symbol: str,
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Optimal entry point analysis. Returns support/resistance levels,
    optimal entry price, and whether now is a good time to buy.
    """
    engine = get_analysis_engine()
    symbol = symbol.upper()

    try:
        analysis = await engine.analyze(symbol, asset_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed for {symbol}: {str(e)}")

    if analysis is None:
        raise HTTPException(status_code=404, detail=f"No analysis available for {symbol}")

    current_price = analysis.current_price
    technical = analysis.technical

    # Extract support and resistance levels from technical analysis
    support_levels = getattr(technical, "support_levels", [])
    resistance_levels = getattr(technical, "resistance_levels", [])

    # Determine optimal entry price (nearest support level below current price)
    supports_below = [s for s in support_levels if s < current_price]
    if supports_below:
        optimal_entry_price = round(max(supports_below), 2)
        optimal_entry_reason = (
            f"Nearest support level at ${optimal_entry_price} offers a lower-risk entry point."
        )
    else:
        # No support below -- use a small discount from current price
        optimal_entry_price = round(current_price * 0.97, 2)
        optimal_entry_reason = (
            "No strong support below current price. Consider a 3% pullback for entry."
        )

    # Decide if now is a good time to buy
    signal = analysis.prediction.signal
    confidence = analysis.prediction.confidence
    is_good_time = signal == "bullish" and confidence >= 0.6

    if is_good_time:
        wait_for_price = None
        recommendation_text = (
            f"{symbol} shows a bullish signal with {confidence:.0%} confidence. "
            f"Current price ${current_price} is a reasonable entry. "
            f"Consider scaling in with a stop-loss below ${optimal_entry_price}."
        )
    else:
        wait_for_price = optimal_entry_price
        if signal == "bearish":
            recommendation_text = (
                f"{symbol} is currently bearish. Wait for price to drop to "
                f"${optimal_entry_price} support level before entering, or wait for "
                f"a bullish signal reversal."
            )
        else:
            recommendation_text = (
                f"{symbol} signal is neutral. Consider waiting for a pullback to "
                f"${optimal_entry_price} for a better risk/reward entry, or wait for "
                f"a confirmed bullish breakout above resistance."
            )

    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "current_price": current_price,
        "support_levels": support_levels,
        "resistance_levels": resistance_levels,
        "optimal_entry_price": optimal_entry_price,
        "optimal_entry_reason": optimal_entry_reason,
        "is_good_time_to_buy": is_good_time,
        "wait_for_price": wait_for_price,
        "recommendation_text": recommendation_text,
    }


@router.get("/when-to-sell/{symbol}")
async def when_to_sell(
    symbol: str,
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exit strategy analysis. Returns target prices at multiple timeframes,
    stop-loss level, trailing stop percentage, take-profit levels,
    and a recommendation.
    """
    engine = get_analysis_engine()
    symbol = symbol.upper()

    try:
        analysis = await engine.analyze(symbol, asset_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed for {symbol}: {str(e)}")

    if analysis is None:
        raise HTTPException(status_code=404, detail=f"No analysis available for {symbol}")

    current_price = analysis.current_price
    prediction = analysis.prediction
    technical = analysis.technical

    expected_return_pct = prediction.expected_return_pct
    stop_loss = prediction.stop_loss

    # Target prices at different timeframes
    target_price_short = round(current_price * (1 + expected_return_pct * 0.25 / 100), 2)
    target_price_medium = round(current_price * (1 + expected_return_pct * 0.60 / 100), 2)
    target_price_long = round(current_price * (1 + expected_return_pct / 100), 2)

    target_prices = {
        "short_term": target_price_short,
        "medium_term": target_price_medium,
        "long_term": target_price_long,
    }

    # Trailing stop: tighter for high-risk, wider for low-risk
    risk_level = prediction.risk_level
    if risk_level == "high":
        trailing_stop_pct = 5.0
    elif risk_level == "medium":
        trailing_stop_pct = 8.0
    else:
        trailing_stop_pct = 12.0

    # Take-profit levels: 25%, 50%, 75%, 100% of target move
    take_profit_levels = [
        {"pct_of_target": 25, "price": target_price_short},
        {"pct_of_target": 50, "price": round(current_price * (1 + expected_return_pct * 0.50 / 100), 2)},
        {"pct_of_target": 75, "price": round(current_price * (1 + expected_return_pct * 0.75 / 100), 2)},
        {"pct_of_target": 100, "price": target_price_long},
    ]

    # Build recommendation
    if prediction.signal == "bullish":
        recommendation_text = (
            f"Hold {symbol} with a trailing stop of {trailing_stop_pct}%. "
            f"Consider taking partial profits at ${target_price_short} (short-term target) "
            f"and ${target_price_medium} (medium-term). "
            f"Full target: ${target_price_long}. Hard stop-loss: ${stop_loss}."
        )
    elif prediction.signal == "bearish":
        recommendation_text = (
            f"Consider exiting {symbol} soon. The outlook is bearish. "
            f"If holding, set a tight stop-loss at ${stop_loss}. "
            f"If price reaches ${target_price_short}, take profits."
        )
    else:
        recommendation_text = (
            f"{symbol} is in a neutral zone. Hold with a stop-loss at ${stop_loss}. "
            f"Scale out at take-profit levels if price moves up. "
            f"Re-evaluate if price breaks below ${stop_loss}."
        )

    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "current_price": current_price,
        "target_prices": target_prices,
        "stop_loss": stop_loss,
        "trailing_stop_pct": trailing_stop_pct,
        "take_profit_levels": take_profit_levels,
        "recommendation_text": recommendation_text,
    }
