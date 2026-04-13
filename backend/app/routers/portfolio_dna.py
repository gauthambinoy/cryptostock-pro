"""
🧬 Portfolio DNA — Generate a unique genetic fingerprint for any portfolio
Unique feature: No other platform has this. Creates a visual DNA identity
based on asset allocation, risk profile, correlation matrix, and trading behavior.
"""
import logging
import hashlib
import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import get_db
from .. import auth, models
from ..services.market_data import get_market_service

router = APIRouter(prefix="/api/portfolio-dna", tags=["🧬 Portfolio DNA"])
logger = logging.getLogger(__name__)


class DNAStrand(BaseModel):
    """Individual DNA strand representing a portfolio characteristic"""
    gene: str
    value: float
    label: str
    color: str


class PortfolioDNA(BaseModel):
    """Complete Portfolio DNA fingerprint"""
    fingerprint_id: str
    portfolio_id: int
    generated_at: datetime
    
    # Core DNA strands (0-100 scale)
    risk_gene: DNAStrand
    diversity_gene: DNAStrand
    momentum_gene: DNAStrand
    volatility_gene: DNAStrand
    correlation_gene: DNAStrand
    crypto_exposure_gene: DNAStrand
    growth_gene: DNAStrand
    stability_gene: DNAStrand
    
    # Composite scores
    quantum_risk_score: float = Field(description="Proprietary 0-100 risk score")
    portfolio_archetype: str = Field(description="e.g. 'The Visionary', 'The Guardian'")
    dna_sequence: str = Field(description="Visual DNA string like AGTCAGTC...")
    compatibility_hash: str = Field(description="Hash for finding similar portfolios")
    
    # Personality traits
    traits: list
    strengths: list
    vulnerabilities: list
    
    # Recommendations
    evolution_suggestions: list


def _compute_dna(holdings, quotes) -> dict:
    """Compute DNA metrics from holdings and market data"""
    if not holdings:
        return None
    
    total_value = 0
    crypto_value = 0
    stock_value = 0
    values = []
    gains = []
    
    for h in holdings:
        if h.is_deleted:
            continue
        quote = quotes.get(h.symbol)
        price = quote.price if quote else h.buy_price
        value = h.quantity * price
        gain_pct = ((price - h.buy_price) / h.buy_price * 100) if h.buy_price > 0 else 0
        
        total_value += value
        values.append(value)
        gains.append(gain_pct)
        
        asset_type = h.asset_type.value if hasattr(h.asset_type, 'value') else str(h.asset_type)
        if asset_type == "crypto":
            crypto_value += value
        else:
            stock_value += value
    
    if total_value == 0:
        return None
    
    n_assets = len(values)
    
    # Diversity: HHI-based (Herfindahl-Hirschman Index)
    weights = [v / total_value for v in values]
    hhi = sum(w**2 for w in weights)
    diversity = max(0, min(100, (1 - hhi) * 100))
    
    # Crypto exposure
    crypto_pct = (crypto_value / total_value * 100) if total_value > 0 else 0
    
    # Risk based on crypto exposure and concentration
    risk = min(100, crypto_pct * 0.7 + hhi * 100 * 0.3)
    
    # Momentum: average gain
    avg_gain = sum(gains) / len(gains) if gains else 0
    momentum = max(0, min(100, 50 + avg_gain))
    
    # Volatility proxy: std dev of gains
    if len(gains) > 1:
        mean_g = sum(gains) / len(gains)
        variance = sum((g - mean_g) ** 2 for g in gains) / len(gains)
        std_dev = math.sqrt(variance)
        volatility = min(100, std_dev * 2)
    else:
        volatility = 50
    
    # Growth: weighted average gain
    growth = max(0, min(100, 50 + sum(g * w for g, w in zip(gains, weights))))
    
    # Stability: inverse of volatility
    stability = max(0, 100 - volatility)
    
    # Correlation proxy: how similar are the asset types
    unique_types = len(set(h.asset_type.value if hasattr(h.asset_type, 'value') else str(h.asset_type) for h in holdings if not h.is_deleted))
    correlation = 100 - (unique_types / max(n_assets, 1)) * 100
    
    # Quantum Risk Score (proprietary composite)
    qrs = round(risk * 0.3 + volatility * 0.25 + (100 - diversity) * 0.2 + correlation * 0.15 + (100 - stability) * 0.1, 1)
    
    # Generate DNA sequence from metrics
    bases = "AGTC"
    dna_values = [risk, diversity, momentum, volatility, correlation, crypto_pct, growth, stability]
    dna_seq = ""
    for v in dna_values:
        idx = int(v / 25) % 4
        dna_seq += bases[idx] * 3
    
    # Determine archetype
    if qrs < 25:
        archetype = "🛡️ The Guardian"
    elif qrs < 40:
        archetype = "⚖️ The Strategist"
    elif qrs < 55:
        archetype = "🔭 The Explorer"
    elif qrs < 70:
        archetype = "⚡ The Visionary"
    elif qrs < 85:
        archetype = "🔥 The Maverick"
    else:
        archetype = "🌊 The Quantum Rider"
    
    # Traits
    traits = []
    if crypto_pct > 60:
        traits.append("Crypto Native")
    if diversity > 70:
        traits.append("Diversification Master")
    if momentum > 70:
        traits.append("Momentum Surfer")
    if stability > 70:
        traits.append("Steady Compounder")
    if volatility > 70:
        traits.append("Volatility Embracer")
    if n_assets > 10:
        traits.append("Portfolio Architect")
    if n_assets <= 3:
        traits.append("Concentrated Conviction")
    if not traits:
        traits.append("Balanced Investor")
    
    # Strengths & vulnerabilities
    strengths = []
    vulnerabilities = []
    
    if diversity > 60:
        strengths.append("Well-diversified across assets")
    else:
        vulnerabilities.append("High concentration risk")
    
    if crypto_pct < 50 and crypto_pct > 10:
        strengths.append("Balanced crypto/traditional exposure")
    elif crypto_pct > 80:
        vulnerabilities.append("Overexposed to crypto volatility")
    
    if momentum > 60:
        strengths.append("Strong recent performance momentum")
    if volatility > 70:
        vulnerabilities.append("High portfolio volatility")
    if stability > 60:
        strengths.append("Stable value preservation")
    
    if not strengths:
        strengths.append("Positioned for multiple outcomes")
    if not vulnerabilities:
        vulnerabilities.append("No critical vulnerabilities detected")
    
    # Evolution suggestions
    suggestions = []
    if diversity < 50:
        suggestions.append("Add 2-3 uncorrelated assets to reduce concentration risk")
    if crypto_pct > 70:
        suggestions.append("Consider adding blue-chip stocks for stability")
    if crypto_pct < 10:
        suggestions.append("Small crypto allocation (5-10%) could boost returns")
    if volatility > 70:
        suggestions.append("Add stablecoins or bonds to reduce portfolio volatility")
    if n_assets < 5:
        suggestions.append("Expand to 8-12 holdings for optimal diversification")
    if not suggestions:
        suggestions.append("Portfolio is well-optimized — maintain current allocation")
    
    # Compatibility hash
    compat = hashlib.md5(f"{int(risk/10)}{int(diversity/10)}{int(momentum/10)}{int(volatility/10)}".encode()).hexdigest()[:12]
    
    return {
        "risk": risk,
        "diversity": diversity,
        "momentum": momentum,
        "volatility": volatility,
        "correlation": correlation,
        "crypto_pct": crypto_pct,
        "growth": growth,
        "stability": stability,
        "qrs": qrs,
        "archetype": archetype,
        "dna_seq": dna_seq,
        "compat": compat,
        "traits": traits,
        "strengths": strengths,
        "vulnerabilities": vulnerabilities,
        "suggestions": suggestions,
    }


def _make_strand(gene: str, value: float, label: str) -> DNAStrand:
    if value < 25:
        color = "#22c55e"
    elif value < 50:
        color = "#3b82f6"
    elif value < 75:
        color = "#f59e0b"
    else:
        color = "#ef4444"
    return DNAStrand(gene=gene, value=round(value, 1), label=label, color=color)


@router.get("/{portfolio_id}", response_model=PortfolioDNA)
async def get_portfolio_dna(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    🧬 Generate a unique DNA fingerprint for your portfolio.
    
    Analyzes your holdings to create a genetic identity including:
    - 8 core DNA strands (risk, diversity, momentum, volatility, etc.)
    - Quantum Risk Score (proprietary 0-100 metric)
    - Portfolio Archetype personality
    - Strengths and vulnerabilities
    - Evolution suggestions
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holdings = [h for h in portfolio.holdings if not h.is_deleted]
    if not holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings")
    
    market_service = get_market_service()
    symbols_dict = {
        h.symbol: (h.asset_type.value if hasattr(h.asset_type, 'value') else str(h.asset_type))
        for h in holdings
    }
    quotes = await market_service.batch_fetch_quotes(symbols_dict) if symbols_dict else {}
    
    dna = _compute_dna(holdings, quotes)
    if not dna:
        raise HTTPException(status_code=400, detail="Unable to compute DNA")
    
    fingerprint = hashlib.sha256(
        f"{portfolio_id}{current_user.id}{dna['dna_seq']}{datetime.utcnow().date()}".encode()
    ).hexdigest()[:16]
    
    return PortfolioDNA(
        fingerprint_id=f"QLD-{fingerprint.upper()}",
        portfolio_id=portfolio_id,
        generated_at=datetime.utcnow(),
        risk_gene=_make_strand("RISK", dna["risk"], "Risk Exposure"),
        diversity_gene=_make_strand("DIV", dna["diversity"], "Diversification"),
        momentum_gene=_make_strand("MOM", dna["momentum"], "Momentum"),
        volatility_gene=_make_strand("VOL", dna["volatility"], "Volatility"),
        correlation_gene=_make_strand("COR", dna["correlation"], "Correlation"),
        crypto_exposure_gene=_make_strand("CRY", dna["crypto_pct"], "Crypto Exposure"),
        growth_gene=_make_strand("GRW", dna["growth"], "Growth"),
        stability_gene=_make_strand("STB", dna["stability"], "Stability"),
        quantum_risk_score=dna["qrs"],
        portfolio_archetype=dna["archetype"],
        dna_sequence=dna["dna_seq"],
        compatibility_hash=dna["compat"],
        traits=dna["traits"],
        strengths=dna["strengths"],
        vulnerabilities=dna["vulnerabilities"],
        evolution_suggestions=dna["suggestions"],
    )
