"""
Advanced trading tools endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service
import yfinance as yf
from math import sqrt
from datetime import datetime, timedelta
from typing import Optional, List

router = APIRouter(prefix="/api/tools", tags=["Trading Tools"])

POPULAR_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
    "JPM", "BAC", "V", "MA", "JNJ", "PFE", "UNH", "XOM", "CVX", "PG",
    "KO", "DIS", "PYPL", "INTC", "AMD", "CRM", "ORCL", "ADBE", "CSCO",
    "QCOM", "TXN", "AVGO",
]


# ============== 1. Asset Screener ==============

@router.get("/screener")
async def asset_screener(
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_change: Optional[float] = None,
    max_change: Optional[float] = None,
    min_volume: Optional[float] = None,
    sort_by: str = Query("price", regex="^(price|change|volume)$"),
    limit: int = Query(20, ge=1, le=100),
):
    """Screen stocks or crypto by price, change, and volume filters."""
    market_service = get_market_service()
    results = []

    if asset_type == "stock":
        for symbol in POPULAR_STOCKS:
            quote = market_service.get_stock_quote(symbol)
            if not quote:
                continue
            results.append({
                "symbol": quote.symbol,
                "name": quote.name,
                "price": quote.price,
                "change": quote.change,
                "change_percent": quote.change_percent,
                "volume": quote.volume,
                "market_cap": quote.market_cap,
                "asset_type": "stock",
            })
    else:
        crypto_ids = market_service.CRYPTO_IDS
        for symbol in crypto_ids:
            quote = await market_service.get_crypto_quote(symbol)
            if not quote:
                continue
            results.append({
                "symbol": quote.symbol,
                "name": quote.name,
                "price": quote.price,
                "change": quote.change,
                "change_percent": quote.change_percent,
                "volume": quote.volume,
                "market_cap": quote.market_cap,
                "asset_type": "crypto",
            })

    # Apply filters
    if min_price is not None:
        results = [r for r in results if r["price"] >= min_price]
    if max_price is not None:
        results = [r for r in results if r["price"] <= max_price]
    if min_change is not None:
        results = [r for r in results if r["change_percent"] >= min_change]
    if max_change is not None:
        results = [r for r in results if r["change_percent"] <= max_change]
    if min_volume is not None:
        results = [r for r in results if r["volume"] and r["volume"] >= min_volume]

    # Sort
    sort_key = {
        "price": lambda r: r["price"],
        "change": lambda r: r["change_percent"],
        "volume": lambda r: r["volume"] or 0,
    }[sort_by]
    results.sort(key=sort_key, reverse=True)

    return results[:limit]


# ============== 2. Support/Resistance Levels ==============

def _find_peaks_troughs(prices: List[float], window: int = 5):
    """Find local maxima (peaks) and local minima (troughs) using a rolling window."""
    peaks = []
    troughs = []
    half = window // 2
    for i in range(half, len(prices) - half):
        segment = prices[i - half : i + half + 1]
        if prices[i] == max(segment):
            peaks.append(prices[i])
        if prices[i] == min(segment):
            troughs.append(prices[i])
    return peaks, troughs


def _cluster_levels(levels: List[float], threshold_pct: float = 0.02) -> List[float]:
    """Cluster nearby price levels (within threshold_pct of each other) and average them."""
    if not levels:
        return []
    levels = sorted(levels)
    clusters: List[List[float]] = [[levels[0]]]
    for level in levels[1:]:
        cluster_avg = sum(clusters[-1]) / len(clusters[-1])
        if abs(level - cluster_avg) / cluster_avg <= threshold_pct:
            clusters[-1].append(level)
        else:
            clusters.append([level])
    return [round(sum(c) / len(c), 2) for c in clusters]


@router.get("/levels/{symbol}")
async def support_resistance_levels(
    symbol: str,
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
):
    """Calculate support and resistance levels for a given symbol."""
    market_service = get_market_service()

    # Get 6 months of price data
    if asset_type == "stock":
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="6mo")
            if hist.empty:
                raise HTTPException(status_code=404, detail=f"No price data found for {symbol}")
            prices = hist["Close"].tolist()
            highs = hist["High"].tolist()
            lows = hist["Low"].tolist()
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}")
    else:
        history = await market_service.get_crypto_history(symbol, days=180)
        if not history:
            raise HTTPException(status_code=404, detail=f"No price data found for {symbol}")
        prices = [h["price"] for h in history]
        highs = prices
        lows = prices

    current_price = prices[-1]

    # Find peaks and troughs
    peaks, troughs = _find_peaks_troughs(prices, window=5)

    # Cluster nearby levels
    resistance_levels = _cluster_levels(peaks)
    support_levels = _cluster_levels(troughs)

    # Filter: resistance above current price, support below
    resistance_levels = sorted([r for r in resistance_levels if r > current_price])
    support_levels = sorted([s for s in support_levels if s < current_price], reverse=True)

    # Take top 3 of each
    resistance_levels = resistance_levels[:3]
    support_levels = support_levels[:3]

    # Pivot point = (high + low + close) / 3 from recent data
    recent_high = max(highs[-20:]) if len(highs) >= 20 else max(highs)
    recent_low = min(lows[-20:]) if len(lows) >= 20 else min(lows)
    recent_close = prices[-1]
    pivot_point = round((recent_high + recent_low + recent_close) / 3, 2)

    return {
        "symbol": symbol.upper(),
        "current_price": round(current_price, 2),
        "support_levels": support_levels,
        "resistance_levels": resistance_levels,
        "pivot_point": pivot_point,
    }


# ============== 3. DCA Calculator ==============

@router.get("/dca")
async def dca_calculator(
    symbol: str = Query(...),
    asset_type: str = Query("stock", regex="^(stock|crypto)$"),
    monthly_amount: float = Query(..., gt=0),
    months: int = Query(12, ge=1, le=120),
):
    """Calculate Dollar Cost Averaging results over a historical period."""
    market_service = get_market_service()

    # Get historical monthly prices
    if asset_type == "stock":
        try:
            ticker = yf.Ticker(symbol)
            period = f"{months + 1}mo" if months <= 24 else f"{int(months / 12) + 1}y"
            hist = ticker.history(period=period, interval="1mo")
            if hist.empty:
                raise HTTPException(status_code=404, detail=f"No historical data for {symbol}")
            monthly_prices = []
            for index, row in hist.iterrows():
                monthly_prices.append({
                    "date": index.strftime("%Y-%m"),
                    "price": row["Close"],
                })
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}")

        # Get current price
        quote = market_service.get_stock_quote(symbol)
        current_price = quote.price if quote else monthly_prices[-1]["price"]
    else:
        days = months * 30
        history = await market_service.get_crypto_history(symbol, days=days)
        if not history:
            raise HTTPException(status_code=404, detail=f"No historical data for {symbol}")

        # Sample one price per month (every ~30 entries)
        step = max(len(history) // months, 1)
        monthly_prices = []
        for i in range(0, len(history), step):
            entry = history[i]
            date_str = entry["date"][:7] if len(entry["date"]) >= 7 else entry["date"]
            monthly_prices.append({
                "date": date_str,
                "price": entry["price"],
            })

        quote = await market_service.get_crypto_quote(symbol)
        current_price = quote.price if quote else monthly_prices[-1]["price"]

    # Trim to requested number of months
    monthly_prices = monthly_prices[-months:]

    if not monthly_prices:
        raise HTTPException(status_code=404, detail="Insufficient historical data")

    # Calculate DCA
    total_shares = 0.0
    total_invested = 0.0
    monthly_data = []

    for entry in monthly_prices:
        price = entry["price"]
        if price <= 0:
            continue
        shares_bought = monthly_amount / price
        total_shares += shares_bought
        total_invested += monthly_amount
        cumulative_value = total_shares * current_price

        monthly_data.append({
            "month": entry["date"],
            "price": round(price, 2),
            "shares_bought": round(shares_bought, 6),
            "cumulative_shares": round(total_shares, 6),
            "cumulative_value": round(cumulative_value, 2),
        })

    current_value = total_shares * current_price
    total_return = current_value - total_invested
    total_return_percent = (total_return / total_invested * 100) if total_invested > 0 else 0

    return {
        "symbol": symbol.upper(),
        "monthly_amount": monthly_amount,
        "months": len(monthly_data),
        "total_invested": round(total_invested, 2),
        "total_shares": round(total_shares, 6),
        "current_value": round(current_value, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return_percent, 2),
        "monthly_data": monthly_data,
    }


# ============== 4. Tax Report ==============

@router.get("/tax-report")
async def tax_report(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate capital gains/losses from user transactions using FIFO matching."""
    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.transaction_date.asc())
        .all()
    )

    if not transactions:
        return {
            "total_gains": 0,
            "total_losses": 0,
            "net_gain_loss": 0,
            "short_term_gains": 0,
            "long_term_gains": 0,
            "short_term_losses": 0,
            "long_term_losses": 0,
            "transactions": [],
        }

    # Build buy lots per symbol (FIFO queue)
    buy_lots: dict = {}  # symbol -> list of {quantity, price, date}
    matched_trades = []

    for txn in transactions:
        symbol = txn.symbol
        if txn.transaction_type.lower() == "buy":
            if symbol not in buy_lots:
                buy_lots[symbol] = []
            buy_lots[symbol].append({
                "quantity": txn.quantity,
                "price": txn.price,
                "date": txn.transaction_date,
            })
        elif txn.transaction_type.lower() == "sell":
            sell_qty = txn.quantity
            sell_price = txn.price
            sell_date = txn.transaction_date

            if symbol not in buy_lots:
                buy_lots[symbol] = []

            # FIFO matching
            while sell_qty > 0 and buy_lots[symbol]:
                lot = buy_lots[symbol][0]
                matched_qty = min(sell_qty, lot["quantity"])

                cost_basis = matched_qty * lot["price"]
                proceeds = matched_qty * sell_price
                gain_loss = proceeds - cost_basis

                # Determine short-term vs long-term
                holding_days = (sell_date - lot["date"]).days if sell_date and lot["date"] else 0
                term = "long_term" if holding_days >= 365 else "short_term"

                matched_trades.append({
                    "symbol": symbol,
                    "quantity": round(matched_qty, 6),
                    "buy_price": round(lot["price"], 2),
                    "sell_price": round(sell_price, 2),
                    "buy_date": lot["date"].isoformat() if lot["date"] else None,
                    "sell_date": sell_date.isoformat() if sell_date else None,
                    "cost_basis": round(cost_basis, 2),
                    "proceeds": round(proceeds, 2),
                    "gain_loss": round(gain_loss, 2),
                    "holding_days": holding_days,
                    "term": term,
                })

                lot["quantity"] -= matched_qty
                sell_qty -= matched_qty

                if lot["quantity"] <= 0:
                    buy_lots[symbol].pop(0)

    # Summarize
    total_gains = sum(t["gain_loss"] for t in matched_trades if t["gain_loss"] > 0)
    total_losses = sum(t["gain_loss"] for t in matched_trades if t["gain_loss"] < 0)
    short_term_gains = sum(
        t["gain_loss"] for t in matched_trades if t["term"] == "short_term" and t["gain_loss"] > 0
    )
    long_term_gains = sum(
        t["gain_loss"] for t in matched_trades if t["term"] == "long_term" and t["gain_loss"] > 0
    )
    short_term_losses = sum(
        t["gain_loss"] for t in matched_trades if t["term"] == "short_term" and t["gain_loss"] < 0
    )
    long_term_losses = sum(
        t["gain_loss"] for t in matched_trades if t["term"] == "long_term" and t["gain_loss"] < 0
    )

    return {
        "total_gains": round(total_gains, 2),
        "total_losses": round(total_losses, 2),
        "net_gain_loss": round(total_gains + total_losses, 2),
        "short_term_gains": round(short_term_gains, 2),
        "long_term_gains": round(long_term_gains, 2),
        "short_term_losses": round(short_term_losses, 2),
        "long_term_losses": round(long_term_losses, 2),
        "transactions": matched_trades,
    }


# ============== 5. Rebalancing Suggestions ==============

@router.get("/rebalance/{portfolio_id}")
async def rebalance_portfolio(
    portfolio_id: int,
    strategy: str = Query("equal_weight", regex="^(equal_weight|market_cap)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate rebalancing suggestions for a portfolio."""
    portfolio = (
        db.query(models.Portfolio)
        .filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        )
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings")

    market_service = get_market_service()
    holding_values = {}
    holding_market_caps = {}

    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)

        price = quote.price if quote else holding.buy_price
        market_cap = quote.market_cap if quote and quote.market_cap else 0
        value = holding.quantity * price

        holding_values[holding.symbol] = round(value, 2)
        holding_market_caps[holding.symbol] = market_cap

    total_value = sum(holding_values.values())
    if total_value <= 0:
        raise HTTPException(status_code=400, detail="Portfolio total value is zero")

    n = len(holding_values)

    # Current allocation
    current_allocation = {
        symbol: round(value / total_value * 100, 2)
        for symbol, value in holding_values.items()
    }

    # Target allocation
    if strategy == "equal_weight":
        target_pct = round(100.0 / n, 2)
        target_allocation = {symbol: target_pct for symbol in holding_values}
    else:
        # market_cap weighted
        total_mcap = sum(holding_market_caps.values())
        if total_mcap > 0:
            target_allocation = {
                symbol: round(mcap / total_mcap * 100, 2)
                for symbol, mcap in holding_market_caps.items()
            }
        else:
            # Fallback to equal weight if market caps unavailable
            target_pct = round(100.0 / n, 2)
            target_allocation = {symbol: target_pct for symbol in holding_values}

    # Generate suggestions
    suggestions = []
    for symbol in holding_values:
        current_pct = current_allocation[symbol]
        target_pct = target_allocation[symbol]
        diff_pct = target_pct - current_pct
        amount_usd = round(diff_pct / 100 * total_value, 2)

        if abs(diff_pct) < 0.5:
            continue

        suggestions.append({
            "symbol": symbol,
            "action": "buy" if diff_pct > 0 else "sell",
            "amount_usd": round(abs(amount_usd), 2),
            "current_pct": current_pct,
            "target_pct": target_pct,
        })

    suggestions.sort(key=lambda s: s["amount_usd"], reverse=True)

    return {
        "portfolio_id": portfolio_id,
        "strategy": strategy,
        "total_value": round(total_value, 2),
        "current_allocation": current_allocation,
        "target_allocation": target_allocation,
        "suggestions": suggestions,
    }
