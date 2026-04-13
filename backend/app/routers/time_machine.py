"""
⏰ Time Machine — What-if historical portfolio simulator
Unique: "What if I had invested $10,000 in BTC in 2015?"
Simulates alternate investment timelines with compound analysis.
"""
import logging
import math
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from .. import auth, models

router = APIRouter(prefix="/api/time-machine", tags=["⏰ Time Machine"])
logger = logging.getLogger(__name__)


class TimelinePoint(BaseModel):
    date: str
    value: float
    gain_pct: float


class TimeMachineResult(BaseModel):
    asset: str
    initial_investment: float
    start_date: str
    end_date: str
    
    # Results
    final_value: float
    total_return_pct: float
    annualized_return_pct: float
    max_drawdown_pct: float
    best_month_pct: float
    worst_month_pct: float
    
    # Comparison
    vs_sp500_return: float
    vs_gold_return: float
    vs_bonds_return: float
    vs_savings_return: float
    
    # Fun stats
    pizza_equivalent: int  # How many pizzas could you buy
    coffee_equivalent: int  # How many coffees
    rent_months_equivalent: float  # How many months of avg rent
    
    # Timeline
    timeline: List[TimelinePoint]
    
    # Verdict
    verdict: str
    opportunity_score: float  # 0-100


# Approximate historical annual returns for simulation
HISTORICAL_RETURNS = {
    "BTC": {"2013": 5507, "2014": -58, "2015": 35, "2016": 125, "2017": 1318, "2018": -73, "2019": 95, "2020": 305, "2021": 60, "2022": -64, "2023": 155, "2024": 130, "2025": 20},
    "ETH": {"2016": 750, "2017": 9162, "2018": -82, "2019": -2, "2020": 469, "2021": 399, "2022": -67, "2023": 91, "2024": 80, "2025": 15},
    "AAPL": {"2013": 8, "2014": 40, "2015": -3, "2016": 12, "2017": 48, "2018": -5, "2019": 89, "2020": 82, "2021": 34, "2022": -26, "2023": 49, "2024": 32, "2025": 8},
    "TSLA": {"2013": 344, "2014": 48, "2015": 8, "2016": -11, "2017": 46, "2018": 7, "2019": 26, "2020": 743, "2021": 50, "2022": -65, "2023": 102, "2024": 65, "2025": -10},
    "NVDA": {"2013": 31, "2014": 17, "2015": 66, "2016": 224, "2017": 81, "2018": -31, "2019": 76, "2020": 122, "2021": 125, "2022": -50, "2023": 239, "2024": 180, "2025": 25},
    "GOOGL": {"2013": 58, "2014": -5, "2015": 47, "2016": 2, "2017": 33, "2018": -1, "2019": 28, "2020": 31, "2021": 65, "2022": -39, "2023": 58, "2024": 38, "2025": 12},
    "SOL": {"2021": 11000, "2022": -94, "2023": 917, "2024": 85, "2025": -5},
    "SP500": {"2013": 30, "2014": 11, "2015": -1, "2016": 10, "2017": 19, "2018": -6, "2019": 29, "2020": 16, "2021": 27, "2022": -19, "2023": 24, "2024": 25, "2025": 5},
    "GOLD": {"2013": -28, "2014": -2, "2015": -11, "2016": 8, "2017": 13, "2018": -2, "2019": 18, "2020": 25, "2021": -4, "2022": 0, "2023": 13, "2024": 27, "2025": 20},
    "BONDS": {"2013": -2, "2014": 6, "2015": 1, "2016": 3, "2017": 4, "2018": 0, "2019": 9, "2020": 8, "2021": -2, "2022": -13, "2023": 6, "2024": 2, "2025": 3},
    "SAVINGS": {"2013": 0.1, "2014": 0.1, "2015": 0.1, "2016": 0.5, "2017": 1.0, "2018": 2.0, "2019": 2.0, "2020": 0.5, "2021": 0.1, "2022": 1.5, "2023": 4.5, "2024": 5.0, "2025": 4.5},
}

DEFAULT_RETURNS = {"2013": 10, "2014": 10, "2015": 10, "2016": 10, "2017": 15, "2018": -5, "2019": 20, "2020": 15, "2021": 25, "2022": -15, "2023": 20, "2024": 15, "2025": 5}


def _simulate(asset: str, amount: float, start_year: int) -> TimeMachineResult:
    """Simulate historical investment"""
    returns = HISTORICAL_RETURNS.get(asset.upper(), DEFAULT_RETURNS)
    sp500 = HISTORICAL_RETURNS["SP500"]
    gold = HISTORICAL_RETURNS["GOLD"]
    bonds = HISTORICAL_RETURNS["BONDS"]
    savings = HISTORICAL_RETURNS["SAVINGS"]
    
    current_year = 2025
    end_year = min(current_year, max(int(y) for y in returns.keys()))
    
    # Find first available year
    available_years = sorted(int(y) for y in returns.keys())
    actual_start = max(start_year, available_years[0] if available_years else start_year)
    
    value = amount
    sp_value = amount
    gold_value = amount
    bond_value = amount
    save_value = amount
    
    timeline = [TimelinePoint(date=f"{actual_start}-01-01", value=amount, gain_pct=0)]
    max_value = amount
    max_dd = 0
    monthly_returns = []
    
    for year in range(actual_start, end_year + 1):
        yr_str = str(year)
        
        ret = returns.get(yr_str, 5) / 100
        value *= (1 + ret)
        monthly_returns.append(ret * 100)
        
        sp_ret = sp500.get(yr_str, 10) / 100
        sp_value *= (1 + sp_ret)
        
        g_ret = gold.get(yr_str, 5) / 100
        gold_value *= (1 + g_ret)
        
        b_ret = bonds.get(yr_str, 3) / 100
        bond_value *= (1 + b_ret)
        
        s_ret = savings.get(yr_str, 1) / 100
        save_value *= (1 + s_ret)
        
        max_value = max(max_value, value)
        dd = ((max_value - value) / max_value) * 100 if max_value > 0 else 0
        max_dd = max(max_dd, dd)
        
        gain_pct = ((value - amount) / amount) * 100
        timeline.append(TimelinePoint(date=f"{year}-12-31", value=round(value, 2), gain_pct=round(gain_pct, 2)))
    
    total_return = ((value - amount) / amount) * 100
    years = max(1, end_year - actual_start + 1)
    annualized = ((value / amount) ** (1 / years) - 1) * 100 if value > 0 and amount > 0 else 0
    
    best_month = max(monthly_returns) if monthly_returns else 0
    worst_month = min(monthly_returns) if monthly_returns else 0
    
    # Fun equivalents
    pizza_price = 15
    coffee_price = 5.50
    avg_rent = 2000
    
    # Verdict
    if total_return > 1000:
        verdict = "🚀 LEGENDARY — You would have been a genius investor!"
    elif total_return > 500:
        verdict = "💎 DIAMOND HANDS — Incredible long-term returns!"
    elif total_return > 100:
        verdict = "🔥 STRONG — Significantly beat traditional investments!"
    elif total_return > 50:
        verdict = "👍 SOLID — Good returns above market average."
    elif total_return > 0:
        verdict = "📊 MODEST — Positive but underperformed other options."
    else:
        verdict = "💸 OUCH — This investment lost money. Timing matters!"
    
    opp_score = min(100, max(0, total_return / 10))
    
    return TimeMachineResult(
        asset=asset.upper(),
        initial_investment=amount,
        start_date=f"{actual_start}-01-01",
        end_date=f"{end_year}-12-31",
        final_value=round(value, 2),
        total_return_pct=round(total_return, 2),
        annualized_return_pct=round(annualized, 2),
        max_drawdown_pct=round(max_dd, 2),
        best_month_pct=round(best_month, 2),
        worst_month_pct=round(worst_month, 2),
        vs_sp500_return=round(((sp_value - amount) / amount) * 100, 2),
        vs_gold_return=round(((gold_value - amount) / amount) * 100, 2),
        vs_bonds_return=round(((bond_value - amount) / amount) * 100, 2),
        vs_savings_return=round(((save_value - amount) / amount) * 100, 2),
        pizza_equivalent=int(value / pizza_price),
        coffee_equivalent=int(value / coffee_price),
        rent_months_equivalent=round(value / avg_rent, 1),
        timeline=timeline,
        verdict=verdict,
        opportunity_score=round(opp_score, 1),
    )


@router.get("/simulate", response_model=TimeMachineResult)
async def simulate_investment(
    asset: str = Query(..., description="Asset symbol (BTC, ETH, AAPL, etc.)"),
    amount: float = Query(..., gt=0, le=100000000, description="Initial investment amount in USD"),
    start_year: int = Query(..., ge=2013, le=2025, description="Year to start the simulation"),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    ⏰ Travel back in time! See what would have happened if you invested.
    
    Example: "What if I invested $10,000 in BTC in 2015?"
    
    Returns:
    - Final portfolio value
    - Comparison vs S&P500, Gold, Bonds, Savings account
    - Max drawdown and best/worst periods
    - Fun equivalents (pizzas, coffees, rent months)
    - Visual timeline
    """
    return _simulate(asset, amount, start_year)


@router.get("/compare")
async def compare_investments(
    amount: float = Query(10000, gt=0, le=100000000),
    start_year: int = Query(2020, ge=2013, le=2025),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    📊 Compare multiple investments side by side.
    What if you put the same amount into different assets?
    """
    assets = ["BTC", "ETH", "AAPL", "NVDA", "TSLA", "SOL", "GOOGL"]
    results = {}
    
    for asset in assets:
        try:
            sim = _simulate(asset, amount, start_year)
            results[asset] = {
                "final_value": sim.final_value,
                "total_return_pct": sim.total_return_pct,
                "annualized_return_pct": sim.annualized_return_pct,
                "max_drawdown_pct": sim.max_drawdown_pct,
                "verdict": sim.verdict,
            }
        except Exception:
            pass
    
    # Sort by return
    sorted_results = dict(sorted(results.items(), key=lambda x: x[1]["total_return_pct"], reverse=True))
    
    return {
        "investment_amount": amount,
        "start_year": start_year,
        "rankings": sorted_results,
        "winner": list(sorted_results.keys())[0] if sorted_results else None,
        "sp500_comparison": _simulate("SP500", amount, start_year).total_return_pct,
    }
