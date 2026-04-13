"""
DeFi Yield Aggregator Service
Fetches yield data from DeFi Llama API (free, no key needed).
"""
import httpx
from typing import List, Dict, Optional
from functools import lru_cache
import time

DEFI_LLAMA_POOLS = "https://yields.llama.fi/pools"
DEFI_LLAMA_PROTOCOLS = "https://api.llama.fi/protocols"

# Cache for 5 minutes
_cache = {}
CACHE_TTL = 300


async def _fetch_with_cache(url: str, key: str) -> dict:
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < CACHE_TTL:
        return _cache[key]["data"]
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        _cache[key] = {"data": data, "ts": now}
        return data


async def get_yields(
    chain: Optional[str] = None,
    category: Optional[str] = None,
    min_tvl: float = 0,
    min_apy: float = 0,
    max_apy: float = 10000,
    sort_by: str = "apy",
    limit: int = 50,
    offset: int = 0,
) -> Dict:
    """Fetch top DeFi yields with filters."""
    try:
        data = await _fetch_with_cache(DEFI_LLAMA_POOLS, "pools")
        pools = data.get("data", [])
    except Exception:
        pools = _generate_sample_pools()

    # Filter
    filtered = []
    for p in pools:
        pool_chain = (p.get("chain") or "").lower()
        pool_category = _categorize_pool(p.get("project", ""), p.get("symbol", ""))
        apy = p.get("apy") or p.get("apyBase") or 0
        tvl = p.get("tvlUsd") or 0

        if chain and pool_chain != chain.lower():
            continue
        if category and pool_category != category.lower():
            continue
        if tvl < min_tvl:
            continue
        if apy < min_apy or apy > max_apy:
            continue

        risk_score = _calculate_risk(tvl, apy, p.get("ilRisk"), p.get("stablecoin", False))

        filtered.append({
            "pool_id": p.get("pool", ""),
            "protocol": p.get("project", "Unknown"),
            "symbol": p.get("symbol", "?"),
            "chain": p.get("chain", "Unknown"),
            "apy": round(apy, 2),
            "apy_base": round(p.get("apyBase") or 0, 2),
            "apy_reward": round(p.get("apyReward") or 0, 2),
            "tvl": round(tvl, 2),
            "category": pool_category,
            "stablecoin": p.get("stablecoin", False),
            "il_risk": p.get("ilRisk", "unknown"),
            "risk_score": risk_score,
        })

    # Sort
    sort_key = {"apy": "apy", "tvl": "tvl", "risk": "risk_score"}.get(sort_by, "apy")
    reverse = sort_by != "risk"
    filtered.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)

    total = len(filtered)
    page = filtered[offset:offset + limit]

    return {"pools": page, "total": total, "offset": offset, "limit": limit}


async def get_protocols() -> List[Dict]:
    """Fetch DeFi protocols with TVL data."""
    try:
        data = await _fetch_with_cache(DEFI_LLAMA_PROTOCOLS, "protocols")
    except Exception:
        data = _generate_sample_protocols()

    protocols = []
    for p in data[:100]:
        protocols.append({
            "name": p.get("name", "Unknown"),
            "slug": p.get("slug", ""),
            "tvl": round(p.get("tvl") or 0, 2),
            "chain": p.get("chain", "Multi"),
            "chains": p.get("chains", []),
            "category": p.get("category", "Other"),
            "change_1d": round(p.get("change_1d") or 0, 2),
            "change_7d": round(p.get("change_7d") or 0, 2),
        })

    protocols.sort(key=lambda x: x["tvl"], reverse=True)
    return protocols


async def get_chains() -> List[Dict]:
    """Get supported chains with aggregated stats."""
    try:
        data = await _fetch_with_cache(DEFI_LLAMA_POOLS, "pools")
        pools = data.get("data", [])
    except Exception:
        pools = _generate_sample_pools()

    chain_stats = {}
    for p in pools:
        chain = p.get("chain", "Unknown")
        if chain not in chain_stats:
            chain_stats[chain] = {"chain": chain, "pool_count": 0, "total_tvl": 0, "avg_apy": 0, "apy_sum": 0}
        chain_stats[chain]["pool_count"] += 1
        chain_stats[chain]["total_tvl"] += p.get("tvlUsd") or 0
        chain_stats[chain]["apy_sum"] += p.get("apy") or 0

    result = []
    for c in chain_stats.values():
        c["avg_apy"] = round(c["apy_sum"] / max(c["pool_count"], 1), 2)
        del c["apy_sum"]
        c["total_tvl"] = round(c["total_tvl"], 2)
        result.append(c)

    result.sort(key=lambda x: x["total_tvl"], reverse=True)
    return result[:30]


async def get_yield_comparison(asset: str) -> List[Dict]:
    """Compare yields for the same asset across protocols."""
    try:
        data = await _fetch_with_cache(DEFI_LLAMA_POOLS, "pools")
        pools = data.get("data", [])
    except Exception:
        pools = _generate_sample_pools()

    matches = []
    asset_upper = asset.upper()
    for p in pools:
        symbol = (p.get("symbol") or "").upper()
        if asset_upper in symbol:
            apy = p.get("apy") or 0
            tvl = p.get("tvlUsd") or 0
            if tvl > 10000:
                matches.append({
                    "protocol": p.get("project", "Unknown"),
                    "chain": p.get("chain", "Unknown"),
                    "symbol": p.get("symbol", ""),
                    "apy": round(apy, 2),
                    "tvl": round(tvl, 2),
                    "pool_id": p.get("pool", ""),
                })

    matches.sort(key=lambda x: x["apy"], reverse=True)
    return matches[:20]


def _categorize_pool(project: str, symbol: str) -> str:
    project_l = project.lower()
    symbol_l = symbol.lower()
    if any(k in project_l for k in ["lido", "rocket", "stak", "steth", "cbeth"]):
        return "staking"
    if any(k in project_l for k in ["aave", "compound", "venus", "lend", "morpho"]):
        return "lending"
    if any(k in project_l for k in ["uniswap", "curve", "sushi", "pancake", "balancer", "velodrome"]):
        return "liquidity"
    if any(k in project_l for k in ["yearn", "beefy", "convex", "harvest"]):
        return "yield_farming"
    return "other"


def _calculate_risk(tvl: float, apy: float, il_risk: str, is_stablecoin: bool) -> int:
    """Risk score 1-10 (1 = safest)."""
    score = 5
    if tvl > 100_000_000:
        score -= 2
    elif tvl > 10_000_000:
        score -= 1
    elif tvl < 1_000_000:
        score += 2

    if apy > 100:
        score += 3
    elif apy > 50:
        score += 2
    elif apy > 20:
        score += 1
    elif apy < 5:
        score -= 1

    if is_stablecoin:
        score -= 1
    if il_risk == "yes":
        score += 1

    return max(1, min(10, score))


def _generate_sample_pools():
    """Fallback sample data when API is unavailable."""
    return [
        {"pool": "aave-eth-v3", "project": "aave-v3", "chain": "Ethereum", "symbol": "ETH", "apy": 3.2, "apyBase": 2.1, "apyReward": 1.1, "tvlUsd": 5200000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "lido-steth", "project": "lido", "chain": "Ethereum", "symbol": "stETH", "apy": 3.8, "apyBase": 3.8, "apyReward": 0, "tvlUsd": 14000000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "aave-usdc-v3", "project": "aave-v3", "chain": "Ethereum", "symbol": "USDC", "apy": 4.5, "apyBase": 4.5, "apyReward": 0, "tvlUsd": 3100000000, "stablecoin": True, "ilRisk": "no"},
        {"pool": "curve-3pool", "project": "curve-dex", "chain": "Ethereum", "symbol": "3CRV", "apy": 2.8, "apyBase": 0.8, "apyReward": 2.0, "tvlUsd": 800000000, "stablecoin": True, "ilRisk": "no"},
        {"pool": "uniswap-eth-usdc", "project": "uniswap-v3", "chain": "Ethereum", "symbol": "ETH-USDC", "apy": 18.5, "apyBase": 18.5, "apyReward": 0, "tvlUsd": 450000000, "stablecoin": False, "ilRisk": "yes"},
        {"pool": "compound-usdt", "project": "compound-v3", "chain": "Ethereum", "symbol": "USDT", "apy": 5.1, "apyBase": 5.1, "apyReward": 0, "tvlUsd": 1200000000, "stablecoin": True, "ilRisk": "no"},
        {"pool": "pancake-cake-bnb", "project": "pancakeswap", "chain": "BSC", "symbol": "CAKE-BNB", "apy": 24.3, "apyBase": 10.3, "apyReward": 14.0, "tvlUsd": 320000000, "stablecoin": False, "ilRisk": "yes"},
        {"pool": "gmx-glp", "project": "gmx", "chain": "Arbitrum", "symbol": "GLP", "apy": 15.2, "apyBase": 15.2, "apyReward": 0, "tvlUsd": 500000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "beefy-eth-steth", "project": "beefy", "chain": "Ethereum", "symbol": "ETH-stETH", "apy": 5.6, "apyBase": 3.6, "apyReward": 2.0, "tvlUsd": 220000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "marinade-msol", "project": "marinade-finance", "chain": "Solana", "symbol": "mSOL", "apy": 7.2, "apyBase": 7.2, "apyReward": 0, "tvlUsd": 900000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "raydium-sol-usdc", "project": "raydium", "chain": "Solana", "symbol": "SOL-USDC", "apy": 32.1, "apyBase": 20.1, "apyReward": 12.0, "tvlUsd": 150000000, "stablecoin": False, "ilRisk": "yes"},
        {"pool": "venus-bnb", "project": "venus", "chain": "BSC", "symbol": "BNB", "apy": 3.9, "apyBase": 3.9, "apyReward": 0, "tvlUsd": 600000000, "stablecoin": False, "ilRisk": "no"},
        {"pool": "velodrome-usdc-dai", "project": "velodrome", "chain": "Optimism", "symbol": "USDC-DAI", "apy": 8.7, "apyBase": 2.7, "apyReward": 6.0, "tvlUsd": 95000000, "stablecoin": True, "ilRisk": "no"},
        {"pool": "trader-joe-avax", "project": "trader-joe", "chain": "Avalanche", "symbol": "AVAX-USDC", "apy": 22.4, "apyBase": 12.4, "apyReward": 10.0, "tvlUsd": 180000000, "stablecoin": False, "ilRisk": "yes"},
    ]


def _generate_sample_protocols():
    return [
        {"name": "Lido", "slug": "lido", "tvl": 14000000000, "chain": "Ethereum", "chains": ["Ethereum", "Polygon", "Solana"], "category": "Liquid Staking", "change_1d": 1.2, "change_7d": 3.5},
        {"name": "Aave V3", "slug": "aave-v3", "tvl": 12000000000, "chain": "Multi", "chains": ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Avalanche"], "category": "Lending", "change_1d": 0.8, "change_7d": 2.1},
        {"name": "Uniswap V3", "slug": "uniswap-v3", "tvl": 5500000000, "chain": "Multi", "chains": ["Ethereum", "Polygon", "Arbitrum", "Optimism", "BSC"], "category": "DEX", "change_1d": -0.3, "change_7d": 1.5},
        {"name": "Curve", "slug": "curve-dex", "tvl": 4200000000, "chain": "Multi", "chains": ["Ethereum", "Polygon", "Arbitrum", "Avalanche"], "category": "DEX", "change_1d": 0.5, "change_7d": -1.2},
        {"name": "Compound V3", "slug": "compound-v3", "tvl": 3100000000, "chain": "Ethereum", "chains": ["Ethereum", "Polygon", "Arbitrum"], "category": "Lending", "change_1d": 1.1, "change_7d": 4.2},
        {"name": "PancakeSwap", "slug": "pancakeswap", "tvl": 2800000000, "chain": "BSC", "chains": ["BSC", "Ethereum", "Arbitrum"], "category": "DEX", "change_1d": -0.7, "change_7d": 0.9},
        {"name": "GMX", "slug": "gmx", "tvl": 950000000, "chain": "Arbitrum", "chains": ["Arbitrum", "Avalanche"], "category": "Derivatives", "change_1d": 2.3, "change_7d": 5.1},
        {"name": "Marinade Finance", "slug": "marinade-finance", "tvl": 900000000, "chain": "Solana", "chains": ["Solana"], "category": "Liquid Staking", "change_1d": 0.4, "change_7d": 2.8},
        {"name": "Beefy", "slug": "beefy", "tvl": 450000000, "chain": "Multi", "chains": ["Ethereum", "BSC", "Polygon", "Arbitrum", "Optimism", "Avalanche"], "category": "Yield", "change_1d": 0.1, "change_7d": -0.5},
        {"name": "Velodrome", "slug": "velodrome", "tvl": 350000000, "chain": "Optimism", "chains": ["Optimism"], "category": "DEX", "change_1d": 1.8, "change_7d": 6.2},
    ]
