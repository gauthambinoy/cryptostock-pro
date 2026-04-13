"""
AI Portfolio Architect Service
Generates optimized, diversified portfolios based on user profile.
"""
import random
from typing import List, Dict, Optional

# Asset universe organized by sector/theme
ASSET_UNIVERSE = {
    "AI": {
        "stocks": [
            {"symbol": "NVDA", "name": "NVIDIA Corp", "sector": "AI/Semiconductors"},
            {"symbol": "MSFT", "name": "Microsoft Corp", "sector": "AI/Cloud"},
            {"symbol": "GOOGL", "name": "Alphabet Inc", "sector": "AI/Search"},
            {"symbol": "AMD", "name": "AMD Inc", "sector": "AI/Semiconductors"},
            {"symbol": "PLTR", "name": "Palantir Technologies", "sector": "AI/Analytics"},
        ],
        "crypto": [
            {"symbol": "FET", "name": "Fetch.ai", "sector": "AI/Blockchain"},
            {"symbol": "RNDR", "name": "Render Token", "sector": "AI/GPU"},
        ]
    },
    "Blockchain": {
        "stocks": [
            {"symbol": "COIN", "name": "Coinbase Global", "sector": "Crypto/Exchange"},
            {"symbol": "MARA", "name": "Marathon Digital", "sector": "Crypto/Mining"},
            {"symbol": "MSTR", "name": "MicroStrategy", "sector": "Crypto/Holdings"},
        ],
        "crypto": [
            {"symbol": "BTC", "name": "Bitcoin", "sector": "Crypto/Store of Value"},
            {"symbol": "ETH", "name": "Ethereum", "sector": "Crypto/Smart Contracts"},
            {"symbol": "SOL", "name": "Solana", "sector": "Crypto/L1"},
            {"symbol": "AVAX", "name": "Avalanche", "sector": "Crypto/L1"},
        ]
    },
    "Green Energy": {
        "stocks": [
            {"symbol": "ENPH", "name": "Enphase Energy", "sector": "Solar"},
            {"symbol": "FSLR", "name": "First Solar", "sector": "Solar"},
            {"symbol": "NEE", "name": "NextEra Energy", "sector": "Renewables"},
            {"symbol": "PLUG", "name": "Plug Power", "sector": "Hydrogen"},
            {"symbol": "TSLA", "name": "Tesla Inc", "sector": "EV/Energy"},
        ],
        "crypto": []
    },
    "Healthcare": {
        "stocks": [
            {"symbol": "UNH", "name": "UnitedHealth Group", "sector": "Health Insurance"},
            {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Pharma"},
            {"symbol": "LLY", "name": "Eli Lilly", "sector": "Pharma/Biotech"},
            {"symbol": "ISRG", "name": "Intuitive Surgical", "sector": "Med Devices"},
            {"symbol": "MRNA", "name": "Moderna", "sector": "Biotech"},
        ],
        "crypto": []
    },
    "Gaming": {
        "stocks": [
            {"symbol": "RBLX", "name": "Roblox Corp", "sector": "Gaming/Metaverse"},
            {"symbol": "TTWO", "name": "Take-Two Interactive", "sector": "Gaming"},
            {"symbol": "EA", "name": "Electronic Arts", "sector": "Gaming"},
            {"symbol": "U", "name": "Unity Software", "sector": "Gaming/Engine"},
        ],
        "crypto": [
            {"symbol": "AXS", "name": "Axie Infinity", "sector": "GameFi"},
            {"symbol": "SAND", "name": "The Sandbox", "sector": "Metaverse"},
            {"symbol": "MANA", "name": "Decentraland", "sector": "Metaverse"},
        ]
    },
    "DeFi": {
        "stocks": [
            {"symbol": "COIN", "name": "Coinbase Global", "sector": "Crypto/Exchange"},
            {"symbol": "SQ", "name": "Block Inc", "sector": "Fintech/Crypto"},
        ],
        "crypto": [
            {"symbol": "UNI", "name": "Uniswap", "sector": "DeFi/DEX"},
            {"symbol": "AAVE", "name": "Aave", "sector": "DeFi/Lending"},
            {"symbol": "MKR", "name": "Maker", "sector": "DeFi/Stablecoin"},
            {"symbol": "LDO", "name": "Lido DAO", "sector": "DeFi/Staking"},
            {"symbol": "CRV", "name": "Curve", "sector": "DeFi/DEX"},
        ]
    },
    "Blue Chip": {
        "stocks": [
            {"symbol": "AAPL", "name": "Apple Inc", "sector": "Tech"},
            {"symbol": "MSFT", "name": "Microsoft Corp", "sector": "Tech"},
            {"symbol": "AMZN", "name": "Amazon.com", "sector": "E-Commerce/Cloud"},
            {"symbol": "JPM", "name": "JPMorgan Chase", "sector": "Banking"},
            {"symbol": "V", "name": "Visa Inc", "sector": "Payments"},
            {"symbol": "PG", "name": "Procter & Gamble", "sector": "Consumer Staples"},
        ],
        "crypto": [
            {"symbol": "BTC", "name": "Bitcoin", "sector": "Crypto/Store of Value"},
            {"symbol": "ETH", "name": "Ethereum", "sector": "Crypto/Smart Contracts"},
        ]
    },
    "Dividends": {
        "stocks": [
            {"symbol": "KO", "name": "Coca-Cola", "sector": "Consumer Staples"},
            {"symbol": "PEP", "name": "PepsiCo", "sector": "Consumer Staples"},
            {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Pharma"},
            {"symbol": "PG", "name": "Procter & Gamble", "sector": "Consumer Staples"},
            {"symbol": "O", "name": "Realty Income", "sector": "REIT"},
            {"symbol": "T", "name": "AT&T", "sector": "Telecom"},
            {"symbol": "VZ", "name": "Verizon", "sector": "Telecom"},
        ],
        "crypto": []
    },
    "Emerging Markets": {
        "stocks": [
            {"symbol": "BABA", "name": "Alibaba Group", "sector": "China/E-Commerce"},
            {"symbol": "TSM", "name": "Taiwan Semiconductor", "sector": "Semiconductors"},
            {"symbol": "GRAB", "name": "Grab Holdings", "sector": "SE Asia/Ride-hailing"},
            {"symbol": "NU", "name": "Nu Holdings", "sector": "Brazil/Fintech"},
            {"symbol": "SE", "name": "Sea Limited", "sector": "SE Asia/Gaming"},
        ],
        "crypto": []
    },
    "Cybersecurity": {
        "stocks": [
            {"symbol": "CRWD", "name": "CrowdStrike", "sector": "Cybersecurity"},
            {"symbol": "PANW", "name": "Palo Alto Networks", "sector": "Cybersecurity"},
            {"symbol": "FTNT", "name": "Fortinet", "sector": "Cybersecurity"},
            {"symbol": "ZS", "name": "Zscaler", "sector": "Cloud Security"},
        ],
        "crypto": []
    }
}

# Pre-built templates
PORTFOLIO_TEMPLATES = [
    {
        "id": "conservative_income",
        "name": "Conservative Income",
        "description": "Stable dividend-paying stocks for steady income. Low risk, reliable returns.",
        "risk_tolerance": "conservative",
        "investment_horizon": "long",
        "interests": ["Blue Chip", "Dividends"],
        "projected_annual_return": {"min": 4, "max": 8},
        "rebalancing_frequency": "quarterly",
    },
    {
        "id": "aggressive_growth",
        "name": "Aggressive Growth",
        "description": "High-growth tech and crypto for maximum appreciation. High risk, high reward.",
        "risk_tolerance": "aggressive",
        "investment_horizon": "long",
        "interests": ["AI", "Blockchain", "DeFi"],
        "projected_annual_return": {"min": 15, "max": 45},
        "rebalancing_frequency": "monthly",
    },
    {
        "id": "crypto_heavy",
        "name": "Crypto Heavy",
        "description": "Primarily cryptocurrency with some crypto-adjacent stocks. Very high volatility.",
        "risk_tolerance": "aggressive",
        "investment_horizon": "medium",
        "interests": ["Blockchain", "DeFi", "Gaming"],
        "projected_annual_return": {"min": -20, "max": 100},
        "rebalancing_frequency": "monthly",
    },
    {
        "id": "balanced_tech",
        "name": "Balanced Tech",
        "description": "Mix of established and emerging tech companies with moderate crypto exposure.",
        "risk_tolerance": "moderate",
        "investment_horizon": "medium",
        "interests": ["AI", "Cybersecurity", "Blue Chip"],
        "projected_annual_return": {"min": 8, "max": 20},
        "rebalancing_frequency": "quarterly",
    },
    {
        "id": "future_forward",
        "name": "Future Forward",
        "description": "Cutting-edge sectors: AI, green energy, gaming metaverse. Long-term bet on innovation.",
        "risk_tolerance": "aggressive",
        "investment_horizon": "long",
        "interests": ["AI", "Green Energy", "Gaming"],
        "projected_annual_return": {"min": 10, "max": 35},
        "rebalancing_frequency": "quarterly",
    },
    {
        "id": "safe_haven",
        "name": "Safe Haven",
        "description": "Recession-resistant stocks and Bitcoin as digital gold. Defensive positioning.",
        "risk_tolerance": "conservative",
        "investment_horizon": "long",
        "interests": ["Dividends", "Healthcare", "Blue Chip"],
        "projected_annual_return": {"min": 3, "max": 7},
        "rebalancing_frequency": "semi-annually",
    },
]

# Risk allocation configs
RISK_PROFILES = {
    "conservative": {
        "stock_pct": 85,
        "crypto_pct": 15,
        "max_single_asset": 20,
        "min_assets": 6,
        "max_assets": 10,
        "projected_return": {"min": 4, "max": 10},
    },
    "moderate": {
        "stock_pct": 65,
        "crypto_pct": 35,
        "max_single_asset": 15,
        "min_assets": 8,
        "max_assets": 14,
        "projected_return": {"min": 8, "max": 22},
    },
    "aggressive": {
        "stock_pct": 40,
        "crypto_pct": 60,
        "max_single_asset": 15,
        "min_assets": 10,
        "max_assets": 18,
        "projected_return": {"min": 15, "max": 50},
    },
}

HORIZON_MULTIPLIER = {
    "short": 0.7,
    "medium": 1.0,
    "long": 1.3,
}

RATIONALES = {
    "AI": "AI sector is experiencing explosive growth with enterprise adoption accelerating.",
    "Blockchain": "Blockchain infrastructure is maturing with institutional adoption.",
    "Green Energy": "Clean energy transition backed by government incentives and ESG mandates.",
    "Healthcare": "Aging population and biotech innovation drive long-term healthcare demand.",
    "Gaming": "Gaming and metaverse represent the next frontier of digital entertainment.",
    "DeFi": "Decentralized finance is disrupting traditional banking with higher yields.",
    "Blue Chip": "Established companies with strong moats provide stability and steady growth.",
    "Dividends": "Dividend aristocrats offer reliable income and compounding returns.",
    "Emerging Markets": "Emerging market growth offers diversification and higher potential returns.",
    "Cybersecurity": "Increasing cyber threats make security spending non-discretionary.",
}


def generate_portfolio(
    age: int,
    investment_amount: float,
    risk_tolerance: str,
    investment_horizon: str,
    interests: List[str],
) -> Dict:
    """Generate an optimized portfolio based on user profile."""
    profile = RISK_PROFILES.get(risk_tolerance, RISK_PROFILES["moderate"])

    # Age adjustment: older = more conservative
    age_factor = max(0.5, min(1.5, (65 - age) / 35))
    adjusted_crypto_pct = profile["crypto_pct"] * age_factor
    adjusted_stock_pct = 100 - adjusted_crypto_pct

    # Collect candidate assets from selected interests
    stock_candidates = []
    crypto_candidates = []
    seen_symbols = set()

    if not interests:
        interests = ["Blue Chip", "AI"]

    for interest in interests:
        sector_data = ASSET_UNIVERSE.get(interest, {})
        for asset in sector_data.get("stocks", []):
            if asset["symbol"] not in seen_symbols:
                stock_candidates.append({**asset, "theme": interest})
                seen_symbols.add(asset["symbol"])
        for asset in sector_data.get("crypto", []):
            if asset["symbol"] not in seen_symbols:
                crypto_candidates.append({**asset, "theme": interest})
                seen_symbols.add(asset["symbol"])

    # Select assets
    num_assets = random.randint(profile["min_assets"], profile["max_assets"])
    num_stocks = max(2, int(num_assets * adjusted_stock_pct / 100))
    num_crypto = max(1, num_assets - num_stocks)

    # Cap to available
    num_stocks = min(num_stocks, len(stock_candidates))
    num_crypto = min(num_crypto, len(crypto_candidates))

    if num_stocks == 0 and stock_candidates:
        num_stocks = min(3, len(stock_candidates))
    if num_crypto == 0 and crypto_candidates:
        num_crypto = min(2, len(crypto_candidates))

    random.shuffle(stock_candidates)
    random.shuffle(crypto_candidates)

    selected_stocks = stock_candidates[:num_stocks]
    selected_crypto = crypto_candidates[:num_crypto]

    # Allocate percentages
    total_stock_alloc = adjusted_stock_pct
    total_crypto_alloc = adjusted_crypto_pct

    portfolio_assets = []

    # Distribute stock allocation
    if selected_stocks:
        base_stock_alloc = total_stock_alloc / len(selected_stocks)
        for i, stock in enumerate(selected_stocks):
            # Add some variance
            variance = random.uniform(-2, 2)
            alloc = round(min(base_stock_alloc + variance, profile["max_single_asset"]), 1)
            portfolio_assets.append({
                "symbol": stock["symbol"],
                "name": stock["name"],
                "asset_type": "stock",
                "sector": stock["sector"],
                "theme": stock["theme"],
                "allocation_pct": alloc,
                "dollar_amount": round(investment_amount * alloc / 100, 2),
                "rationale": RATIONALES.get(stock["theme"], "Diversification across high-potential sectors."),
            })

    # Distribute crypto allocation
    if selected_crypto:
        base_crypto_alloc = total_crypto_alloc / len(selected_crypto)
        for i, crypto in enumerate(selected_crypto):
            variance = random.uniform(-1.5, 1.5)
            alloc = round(min(base_crypto_alloc + variance, profile["max_single_asset"]), 1)
            portfolio_assets.append({
                "symbol": crypto["symbol"],
                "name": crypto["name"],
                "asset_type": "crypto",
                "sector": crypto["sector"],
                "theme": crypto["theme"],
                "allocation_pct": alloc,
                "dollar_amount": round(investment_amount * alloc / 100, 2),
                "rationale": RATIONALES.get(crypto["theme"], "Crypto exposure for growth potential."),
            })

    # Normalize to 100%
    total = sum(a["allocation_pct"] for a in portfolio_assets)
    if total > 0:
        for asset in portfolio_assets:
            asset["allocation_pct"] = round(asset["allocation_pct"] / total * 100, 1)
            asset["dollar_amount"] = round(investment_amount * asset["allocation_pct"] / 100, 2)

    # Sort by allocation descending
    portfolio_assets.sort(key=lambda x: x["allocation_pct"], reverse=True)

    # Determine rebalancing frequency
    horizon_rebal = {
        "short": "monthly",
        "medium": "quarterly",
        "long": "semi-annually",
    }

    # Projected returns
    horizon_mult = HORIZON_MULTIPLIER.get(investment_horizon, 1.0)
    base_return = profile["projected_return"]
    projected_return = {
        "min": round(base_return["min"] * horizon_mult, 1),
        "max": round(base_return["max"] * horizon_mult, 1),
    }

    return {
        "portfolio_name": f"AI Optimized - {risk_tolerance.title()}",
        "assets": portfolio_assets,
        "total_assets": len(portfolio_assets),
        "stock_allocation": round(sum(a["allocation_pct"] for a in portfolio_assets if a["asset_type"] == "stock"), 1),
        "crypto_allocation": round(sum(a["allocation_pct"] for a in portfolio_assets if a["asset_type"] == "crypto"), 1),
        "rebalancing_frequency": horizon_rebal.get(investment_horizon, "quarterly"),
        "projected_annual_return": projected_return,
        "investment_amount": investment_amount,
        "risk_profile": {
            "tolerance": risk_tolerance,
            "horizon": investment_horizon,
            "age": age,
            "interests": interests,
        },
        "diversification_score": min(100, len(portfolio_assets) * 8 + len(set(a["theme"] for a in portfolio_assets)) * 10),
    }


def get_templates() -> List[Dict]:
    """Return pre-built portfolio templates."""
    return PORTFOLIO_TEMPLATES
