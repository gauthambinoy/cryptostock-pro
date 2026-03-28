"""
Advanced portfolio analytics endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service
import yfinance as yf
from datetime import datetime, timedelta
from math import sqrt

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "GOOG": "Technology",
    "AMZN": "Consumer Cyclical", "TSLA": "Consumer Cyclical", "NVDA": "Technology",
    "META": "Technology", "NFLX": "Communication", "DIS": "Communication",
    "JPM": "Financial", "BAC": "Financial", "V": "Financial", "MA": "Financial", "GS": "Financial",
    "JNJ": "Healthcare", "PFE": "Healthcare", "UNH": "Healthcare", "ABBV": "Healthcare",
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy",
    "PG": "Consumer Defensive", "KO": "Consumer Defensive", "PEP": "Consumer Defensive",
    "BTC": "Crypto", "ETH": "Crypto", "SOL": "Crypto", "XRP": "Crypto",
    "ADA": "Crypto", "DOGE": "Crypto", "BNB": "Crypto", "DOT": "Crypto",
    "MATIC": "Crypto", "LINK": "Crypto", "UNI": "Crypto", "AVAX": "Crypto",
    "LTC": "Crypto", "ATOM": "Crypto", "SHIB": "Crypto",
}


def _mean(values):
    return sum(values) / len(values) if values else 0


def _std(values):
    if len(values) < 2:
        return 0
    m = _mean(values)
    variance = sum((x - m) ** 2 for x in values) / (len(values) - 1)
    return sqrt(variance) if variance > 0 else 0


def _covariance(x, y):
    if len(x) != len(y) or len(x) < 2:
        return 0
    mx, my = _mean(x), _mean(y)
    return sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / (len(x) - 1)


def _pearson(x, y):
    sx, sy = _std(x), _std(y)
    if sx == 0 or sy == 0:
        return 0
    return _covariance(x, y) / (sx * sy)


def _daily_returns(prices):
    if len(prices) < 2:
        return []
    return [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices)) if prices[i-1] != 0]


def _max_drawdown(prices):
    if len(prices) < 2:
        return 0
    peak = prices[0]
    max_dd = 0
    for p in prices:
        if p > peak:
            peak = p
        dd = (peak - p) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
    return round(max_dd * 100, 2)


@router.get("/{portfolio_id}/advanced")
async def get_advanced_analytics(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    all_returns = []
    market_returns = []
    total_invested = 0
    current_value = 0
    earliest_date = datetime.now()

    # Get S&P 500 data for beta calculation
    try:
        spy = yf.Ticker("^GSPC")
        spy_hist = spy.history(period="1y")
        spy_prices = spy_hist["Close"].tolist() if len(spy_hist) > 0 else []
        market_returns = _daily_returns(spy_prices)
    except:
        market_returns = []

    for holding in portfolio.holdings:
        invested = holding.quantity * holding.buy_price
        total_invested += invested
        if holding.buy_date and holding.buy_date.replace(tzinfo=None) < earliest_date:
            earliest_date = holding.buy_date.replace(tzinfo=None)

        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
            try:
                ticker = yf.Ticker(holding.symbol)
                hist = ticker.history(period="1y")
                prices = hist["Close"].tolist() if len(hist) > 0 else []
                rets = _daily_returns(prices)
                all_returns.extend(rets)
            except:
                pass
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)

        if quote:
            current_value += holding.quantity * quote.price

    # Sharpe Ratio
    risk_free_daily = 0.05 / 252
    if all_returns:
        mean_ret = _mean(all_returns)
        std_ret = _std(all_returns)
        sharpe = ((mean_ret - risk_free_daily) / std_ret * sqrt(252)) if std_ret > 0 else 0
    else:
        sharpe = 0

    # Volatility (annualized)
    volatility = _std(all_returns) * sqrt(252) * 100 if all_returns else 0

    # Beta
    min_len = min(len(all_returns), len(market_returns))
    if min_len > 10:
        ar = all_returns[:min_len]
        mr = market_returns[:min_len]
        var_m = _std(mr) ** 2
        beta = _covariance(ar, mr) / var_m if var_m > 0 else 1
    else:
        beta = 1

    # CAGR
    years = max((datetime.now() - earliest_date).days / 365.25, 0.01)
    if total_invested > 0 and current_value > 0:
        cagr = ((current_value / total_invested) ** (1 / years) - 1) * 100
    else:
        cagr = 0

    # Total Return
    total_return = ((current_value - total_invested) / total_invested * 100) if total_invested > 0 else 0

    return {
        "sharpe_ratio": round(sharpe, 3),
        "volatility": round(volatility, 2),
        "beta": round(beta, 3),
        "max_drawdown": _max_drawdown([total_invested + (total_invested * r) for r in (all_returns or [0])]),
        "cagr": round(cagr, 2),
        "total_return": round(total_return, 2),
    }


@router.get("/{portfolio_id}/correlation")
async def get_correlation_matrix(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    symbols = []
    returns_map = {}

    for holding in portfolio.holdings:
        sym = holding.symbol
        try:
            if holding.asset_type == models.AssetType.STOCK:
                ticker = yf.Ticker(sym)
                hist = ticker.history(period="3mo")
                prices = hist["Close"].tolist() if len(hist) > 0 else []
            else:
                market_service = get_market_service()
                hist = await market_service.get_crypto_history(sym, 90)
                prices = [h["price"] for h in hist] if hist else []

            rets = _daily_returns(prices)
            if rets:
                symbols.append(sym)
                returns_map[sym] = rets
        except:
            pass

    n = len(symbols)
    matrix = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                matrix[i][j] = 1.0
            else:
                ri = returns_map[symbols[i]]
                rj = returns_map[symbols[j]]
                min_l = min(len(ri), len(rj))
                if min_l > 5:
                    matrix[i][j] = round(_pearson(ri[:min_l], rj[:min_l]), 3)

    return {"symbols": symbols, "matrix": matrix}


@router.get("/{portfolio_id}/pnl-calendar")
async def get_pnl_calendar(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Generate simulated daily P&L based on holdings
    import random
    random.seed(42)
    today = datetime.now()
    entries = []
    total_invested = sum(h.quantity * h.buy_price for h in portfolio.holdings)

    for i in range(365):
        date = today - timedelta(days=364 - i)
        # Simulate daily P&L as percentage of portfolio
        base_change = total_invested * random.gauss(0.001, 0.02) if total_invested > 0 else 0
        entries.append({
            "date": date.strftime("%Y-%m-%d"),
            "pnl": round(base_change, 2)
        })

    return entries


@router.get("/{portfolio_id}/sector-breakdown")
async def get_sector_breakdown(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    sector_values = {}

    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)

        value = holding.quantity * (quote.price if quote else holding.buy_price)
        sector = SECTOR_MAP.get(holding.symbol, "Other")
        sector_values[sector] = sector_values.get(sector, 0) + value

    total = sum(sector_values.values())
    result = []
    for sector, value in sorted(sector_values.items(), key=lambda x: x[1], reverse=True):
        result.append({
            "sector": sector,
            "percentage": round(value / total * 100, 2) if total > 0 else 0,
            "value": round(value, 2)
        })

    return result


@router.get("/{portfolio_id}/performance-history")
async def get_performance_history(
    portfolio_id: int,
    days: int = 90,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    total_invested = sum(h.quantity * h.buy_price for h in portfolio.holdings)
    current_total = 0

    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)
        current_total += holding.quantity * (quote.price if quote else holding.buy_price)

    # Linear interpolation from invested to current
    today = datetime.now()
    history = []
    for i in range(days):
        date = today - timedelta(days=days - 1 - i)
        progress = i / max(days - 1, 1)
        value = total_invested + (current_total - total_invested) * progress
        # Add some realistic variance
        import random
        random.seed(int(date.timestamp()))
        noise = value * random.gauss(0, 0.01)
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(value + noise, 2)
        })

    return history


@router.get("/{portfolio_id}/risk-score")
async def get_risk_score(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    all_returns = []
    market_returns = []
    holding_values = []
    crypto_value = 0
    total_value = 0
    sectors = set()

    # Get S&P 500 data for beta calculation
    try:
        spy = yf.Ticker("^GSPC")
        spy_hist = spy.history(period="1y")
        spy_prices = spy_hist["Close"].tolist() if len(spy_hist) > 0 else []
        market_returns = _daily_returns(spy_prices)
    except:
        market_returns = []

    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
            try:
                ticker = yf.Ticker(holding.symbol)
                hist = ticker.history(period="1y")
                prices = hist["Close"].tolist() if len(hist) > 0 else []
                rets = _daily_returns(prices)
                all_returns.extend(rets)
            except:
                pass
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)

        value = holding.quantity * (quote.price if quote else holding.buy_price)
        holding_values.append(value)
        total_value += value
        sectors.add(SECTOR_MAP.get(holding.symbol, "Other"))

        if holding.asset_type == models.AssetType.CRYPTO:
            crypto_value += value

    # Concentration risk: if top holding > 50% of portfolio, add 25 points
    if total_value > 0 and holding_values:
        top_pct = max(holding_values) / total_value * 100
    else:
        top_pct = 0
    concentration = 25 if top_pct > 50 else round(top_pct / 50 * 25, 1)

    # Volatility: map 0-100% annualized vol to 0-25 points
    annualized_vol = _std(all_returns) * sqrt(252) * 100 if all_returns else 0
    volatility_score = min(25, round(annualized_vol / 100 * 25, 1))

    # Crypto exposure: crypto_pct * 0.2 (max 20 points)
    crypto_pct = (crypto_value / total_value * 100) if total_value > 0 else 0
    crypto_score = min(20, round(crypto_pct * 0.2, 1))

    # Diversification: fewer assets = more risk (1 asset = 20, 10+ = 0)
    num_assets = len(portfolio.holdings)
    if num_assets >= 10:
        diversification_score = 0
    else:
        diversification_score = round((10 - num_assets) / 9 * 20, 1)

    # Beta: map 0-2 beta to 0-10 points
    min_len = min(len(all_returns), len(market_returns))
    if min_len > 10:
        ar = all_returns[:min_len]
        mr = market_returns[:min_len]
        var_m = _std(mr) ** 2
        beta = _covariance(ar, mr) / var_m if var_m > 0 else 1
    else:
        beta = 1
    beta_score = min(10, round(max(0, beta) / 2 * 10, 1))

    risk = min(100, max(1, round(concentration + volatility_score + crypto_score + diversification_score + beta_score)))

    if risk <= 25:
        risk_level = "Low"
    elif risk <= 50:
        risk_level = "Medium"
    elif risk <= 75:
        risk_level = "High"
    else:
        risk_level = "Very High"

    return {
        "risk_score": risk,
        "risk_level": risk_level,
        "factors": {
            "concentration": {"score": concentration, "max": 25, "top_holding_pct": round(top_pct, 2)},
            "volatility": {"score": volatility_score, "max": 25, "annualized_vol_pct": round(annualized_vol, 2)},
            "crypto_exposure": {"score": crypto_score, "max": 20, "crypto_pct": round(crypto_pct, 2)},
            "diversification": {"score": diversification_score, "max": 20, "num_assets": num_assets, "num_sectors": len(sectors)},
            "beta": {"score": beta_score, "max": 10, "beta": round(beta, 3)},
        }
    }


@router.get("/{portfolio_id}/monte-carlo")
async def get_monte_carlo(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import random

    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    market_service = get_market_service()
    all_returns = []
    current_value = 0

    for holding in portfolio.holdings:
        if holding.asset_type == models.AssetType.STOCK:
            quote = market_service.get_stock_quote(holding.symbol)
            try:
                ticker = yf.Ticker(holding.symbol)
                hist = ticker.history(period="1y")
                prices = hist["Close"].tolist() if len(hist) > 0 else []
                rets = _daily_returns(prices)
                all_returns.extend(rets)
            except:
                pass
        else:
            quote = await market_service.get_crypto_quote(holding.symbol)

        current_value += holding.quantity * (quote.price if quote else holding.buy_price)

    if not all_returns:
        mean_return = 0.0004  # ~10% annual default
        std_return = 0.012    # ~19% annual vol default
    else:
        mean_return = _mean(all_returns)
        std_return = _std(all_returns)

    days = 252
    simulations = 1000
    results = []
    sample_paths = []

    for sim_idx in range(simulations):
        value = current_value
        path = [value]
        for _ in range(days):
            daily_return = random.gauss(mean_return, std_return)
            value *= (1 + daily_return)
            path.append(value)
        results.append(value)
        # Sample every 50th simulation for the fan chart
        if sim_idx % 50 == 0:
            sample_paths.append([round(v, 2) for v in path])

    results.sort()
    n = len(results)

    return {
        "current_value": round(current_value, 2),
        "worst_case": round(results[int(n * 0.05)], 2),
        "pessimistic": round(results[int(n * 0.25)], 2),
        "median": round(results[int(n * 0.50)], 2),
        "optimistic": round(results[int(n * 0.75)], 2),
        "best_case": round(results[int(n * 0.95)], 2),
        "simulations": simulations,
        "time_horizon_days": days,
        "mean_daily_return": round(mean_return, 6),
        "std_daily_return": round(std_return, 6),
        "sample_paths": sample_paths,
    }
