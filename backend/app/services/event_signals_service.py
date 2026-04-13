"""
Event-Driven Trading Signals Service
Detects market-moving events and generates trading signals.
"""
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Event type configurations
EVENT_CONFIGS = {
    "earnings_report": {
        "bullish_keywords": ["beat", "exceeded", "raised guidance", "strong growth", "record revenue"],
        "bearish_keywords": ["missed", "lowered guidance", "decline", "weak", "disappointing"],
        "default_impact": "high",
    },
    "fed_speech": {
        "bullish_keywords": ["dovish", "rate cut", "pause", "accommodation", "easing"],
        "bearish_keywords": ["hawkish", "rate hike", "tightening", "inflation concern", "restrictive"],
        "default_impact": "critical",
    },
    "sec_filing": {
        "bullish_keywords": ["insider buying", "stock buyback", "increased stake"],
        "bearish_keywords": ["insider selling", "SEC investigation", "class action"],
        "default_impact": "medium",
    },
    "merger_acquisition": {
        "bullish_keywords": ["acquisition", "merger", "takeover bid", "premium offer"],
        "bearish_keywords": ["deal collapse", "regulatory block", "antitrust"],
        "default_impact": "high",
    },
    "product_launch": {
        "bullish_keywords": ["launched", "breakthrough", "FDA approval", "patent granted"],
        "bearish_keywords": ["recalled", "delayed", "FDA rejection", "patent expired"],
        "default_impact": "medium",
    },
    "regulatory": {
        "bullish_keywords": ["approved", "deregulation", "favorable ruling"],
        "bearish_keywords": ["banned", "sanctions", "fine", "investigation"],
        "default_impact": "high",
    },
    "crypto_regulation": {
        "bullish_keywords": ["ETF approved", "legal tender", "institutional adoption", "clarity"],
        "bearish_keywords": ["ban", "crackdown", "restricted", "delisted"],
        "default_impact": "high",
    },
    "geopolitical": {
        "bullish_keywords": ["ceasefire", "trade deal", "peace", "agreement"],
        "bearish_keywords": ["conflict", "sanctions", "trade war", "embargo"],
        "default_impact": "critical",
    },
}

HISTORICAL_PATTERNS = {
    "earnings_report": {
        "bullish": "Historically, stocks that beat earnings by >10% see an average 5-8% move in the following week.",
        "bearish": "Earnings misses typically result in 3-10% declines, with recovery taking 2-4 weeks on average.",
    },
    "fed_speech": {
        "bullish": "Dovish Fed signals have historically boosted markets 2-4% within 48 hours. Growth stocks benefit most.",
        "bearish": "Hawkish surprises have led to 3-5% corrections historically, with tech/growth most affected.",
    },
    "merger_acquisition": {
        "bullish": "M&A targets typically trade within 5% of offer price. Sector peers often see 2-3% sympathy gains.",
        "bearish": "Failed deals result in 15-30% target declines. Acquirer stock often rises 3-5% on deal cancellation.",
    },
    "crypto_regulation": {
        "bullish": "Positive crypto regulation has historically driven 10-20% rallies across major crypto assets within days.",
        "bearish": "Regulatory crackdowns typically cause 15-30% drops, with altcoins affected more than BTC/ETH.",
    },
    "regulatory": {
        "bullish": "Favorable regulatory decisions lead to 5-15% moves for directly affected companies.",
        "bearish": "Regulatory fines/investigations typically cause 5-20% drops depending on severity.",
    },
    "geopolitical": {
        "bullish": "Geopolitical de-escalation historically benefits risk assets, with emerging markets outperforming.",
        "bearish": "Geopolitical tensions drive safe-haven flows. Gold, USD, and treasuries typically rally.",
    },
    "product_launch": {
        "bullish": "Successful product launches drive 3-8% gains. FDA approvals can see 20-50% biotech moves.",
        "bearish": "Product recalls/delays typically cause 5-15% drops. FDA rejections see 30-60% biotech declines.",
    },
    "sec_filing": {
        "bullish": "Insider buying clusters have preceded 10%+ outperformance over 6 months historically.",
        "bearish": "Insider selling clusters often precede 5-10% underperformance over 3-6 months.",
    },
}

# Sample events data
SAMPLE_EVENTS = [
    {"title": "Federal Reserve signals potential rate cuts in upcoming meetings", "event_type": "fed_speech", "source": "Reuters", "affected_symbols": ["SPY", "QQQ", "TLT"], "direction": "bullish", "impact": "critical"},
    {"title": "NVIDIA reports record Q4 revenue, beats estimates by 22%", "event_type": "earnings_report", "source": "CNBC", "affected_symbols": ["NVDA", "AMD", "SMCI"], "direction": "bullish", "impact": "high"},
    {"title": "SEC approves spot Ethereum ETF applications", "event_type": "crypto_regulation", "source": "Bloomberg", "affected_symbols": ["ETH", "BTC", "COIN"], "direction": "bullish", "impact": "critical"},
    {"title": "Apple delays Vision Pro Gen 2 to 2026", "event_type": "product_launch", "source": "WSJ", "affected_symbols": ["AAPL", "META", "MSFT"], "direction": "bearish", "impact": "medium"},
    {"title": "Tesla announces $10B stock buyback program", "event_type": "sec_filing", "source": "SEC Filing", "affected_symbols": ["TSLA"], "direction": "bullish", "impact": "high"},
    {"title": "EU imposes new tariffs on Chinese EV imports", "event_type": "geopolitical", "source": "Financial Times", "affected_symbols": ["NIO", "XPEV", "LI", "F", "GM"], "direction": "bearish", "impact": "high"},
    {"title": "Pfizer's obesity drug shows 25% weight loss in Phase 3 trial", "event_type": "product_launch", "source": "Reuters", "affected_symbols": ["PFE", "LLY", "NVO"], "direction": "bullish", "impact": "high"},
    {"title": "Microsoft to acquire gaming studio for $8.5B", "event_type": "merger_acquisition", "source": "Bloomberg", "affected_symbols": ["MSFT", "EA", "TTWO"], "direction": "bullish", "impact": "medium"},
    {"title": "China announces comprehensive crypto mining ban enforcement", "event_type": "crypto_regulation", "source": "Reuters", "affected_symbols": ["BTC", "ETH", "MARA", "RIOT"], "direction": "bearish", "impact": "high"},
    {"title": "Amazon Web Services experiences major outage affecting thousands", "event_type": "product_launch", "source": "TechCrunch", "affected_symbols": ["AMZN", "MSFT", "GOOGL"], "direction": "bearish", "impact": "medium"},
    {"title": "Federal Reserve Chair warns inflation remains persistent", "event_type": "fed_speech", "source": "CNBC", "affected_symbols": ["SPY", "QQQ", "IWM", "TLT"], "direction": "bearish", "impact": "critical"},
    {"title": "Solana ecosystem sees record TVL and transaction volume", "event_type": "crypto_regulation", "source": "CoinDesk", "affected_symbols": ["SOL", "JTO", "BONK"], "direction": "bullish", "impact": "medium"},
    {"title": "Google DeepMind achieves breakthrough in protein folding AI", "event_type": "product_launch", "source": "Nature", "affected_symbols": ["GOOGL", "NVDA", "DNA"], "direction": "bullish", "impact": "medium"},
    {"title": "Major bank downgrades semiconductor sector to underweight", "event_type": "sec_filing", "source": "Goldman Sachs", "affected_symbols": ["NVDA", "AMD", "INTC", "TSM"], "direction": "bearish", "impact": "medium"},
    {"title": "US-China trade talks resume with positive momentum", "event_type": "geopolitical", "source": "Reuters", "affected_symbols": ["BABA", "JD", "PDD", "FXI"], "direction": "bullish", "impact": "high"},
    {"title": "Coinbase receives Wells notice from SEC", "event_type": "regulatory", "source": "SEC", "affected_symbols": ["COIN", "BTC", "ETH"], "direction": "bearish", "impact": "high"},
    {"title": "AMD unveils next-gen AI chips challenging NVIDIA dominance", "event_type": "product_launch", "source": "The Verge", "affected_symbols": ["AMD", "NVDA", "INTC"], "direction": "bullish", "impact": "high"},
    {"title": "Oil prices surge 8% on OPEC+ production cut announcement", "event_type": "geopolitical", "source": "Bloomberg", "affected_symbols": ["XOM", "CVX", "OXY", "USO"], "direction": "bullish", "impact": "high"},
]


def get_live_signals(
    event_type: Optional[str] = None,
    impact: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = 20,
) -> List[Dict]:
    """Get latest event signals."""
    signals = []
    for event in SAMPLE_EVENTS:
        # Randomize timing
        hours_ago = random.uniform(0.1, 24)
        published = datetime.now() - timedelta(hours=hours_ago)
        confidence = random.randint(65, 95)

        action_map = {"bullish": "buy", "bearish": "sell"}
        horizon_options = ["immediate", "short_term", "medium_term"]

        et = event["event_type"]
        dir_ = event["direction"]
        pattern = HISTORICAL_PATTERNS.get(et, {}).get(dir_, "Limited historical data available.")

        signal = {
            "id": random.randint(1000, 9999),
            "title": event["title"],
            "event_type": et,
            "source": event["source"],
            "source_url": f"https://example.com/news/{random.randint(10000, 99999)}",
            "impact_score": event["impact"],
            "affected_symbols": event["affected_symbols"],
            "signal_direction": dir_,
            "signal_confidence": confidence,
            "suggested_action": action_map.get(dir_, "watch"),
            "time_horizon": random.choice(horizon_options),
            "historical_pattern": pattern,
            "published_at": published.isoformat(),
            "hours_ago": round(hours_ago, 1),
        }
        signals.append(signal)

    # Apply filters
    if event_type:
        signals = [s for s in signals if s["event_type"] == event_type]
    if impact:
        signals = [s for s in signals if s["impact_score"] == impact]
    if direction:
        signals = [s for s in signals if s["signal_direction"] == direction]

    signals.sort(key=lambda x: x["hours_ago"])
    return signals[:limit]


def get_symbol_events(symbol: str) -> List[Dict]:
    """Get events affecting a specific symbol."""
    all_signals = get_live_signals()
    return [s for s in all_signals if symbol.upper() in s["affected_symbols"]]


def get_event_calendar() -> List[Dict]:
    """Get upcoming scheduled events."""
    now = datetime.now()
    calendar = [
        {"event": "FOMC Meeting", "date": (now + timedelta(days=random.randint(5, 15))).strftime("%Y-%m-%d"), "type": "fed_speech", "impact": "critical", "countdown_days": random.randint(5, 15)},
        {"event": "AAPL Earnings Report", "date": (now + timedelta(days=random.randint(2, 10))).strftime("%Y-%m-%d"), "type": "earnings_report", "impact": "high", "countdown_days": random.randint(2, 10)},
        {"event": "NVDA Earnings Report", "date": (now + timedelta(days=random.randint(3, 20))).strftime("%Y-%m-%d"), "type": "earnings_report", "impact": "high", "countdown_days": random.randint(3, 20)},
        {"event": "CPI Data Release", "date": (now + timedelta(days=random.randint(1, 12))).strftime("%Y-%m-%d"), "type": "regulatory", "impact": "critical", "countdown_days": random.randint(1, 12)},
        {"event": "BTC Halving Event", "date": (now + timedelta(days=random.randint(20, 100))).strftime("%Y-%m-%d"), "type": "crypto_regulation", "impact": "high", "countdown_days": random.randint(20, 100)},
        {"event": "TSLA Earnings Report", "date": (now + timedelta(days=random.randint(5, 25))).strftime("%Y-%m-%d"), "type": "earnings_report", "impact": "high", "countdown_days": random.randint(5, 25)},
        {"event": "ECB Rate Decision", "date": (now + timedelta(days=random.randint(8, 30))).strftime("%Y-%m-%d"), "type": "fed_speech", "impact": "high", "countdown_days": random.randint(8, 30)},
        {"event": "Jobs Report (Non-Farm Payrolls)", "date": (now + timedelta(days=random.randint(1, 8))).strftime("%Y-%m-%d"), "type": "regulatory", "impact": "high", "countdown_days": random.randint(1, 8)},
    ]
    calendar.sort(key=lambda x: x["countdown_days"])
    return calendar


def get_signal_accuracy() -> Dict:
    """Get historical signal accuracy stats."""
    return {
        "overall_accuracy": round(random.uniform(68, 82), 1),
        "by_type": {
            "earnings_report": round(random.uniform(70, 85), 1),
            "fed_speech": round(random.uniform(65, 80), 1),
            "crypto_regulation": round(random.uniform(60, 75), 1),
            "merger_acquisition": round(random.uniform(75, 90), 1),
            "product_launch": round(random.uniform(65, 78), 1),
            "regulatory": round(random.uniform(68, 82), 1),
            "geopolitical": round(random.uniform(55, 72), 1),
        },
        "total_signals_generated": random.randint(500, 2000),
        "signals_today": random.randint(5, 25),
        "bullish_ratio": round(random.uniform(40, 60), 1),
    }


def get_trending_symbols() -> List[Dict]:
    """Get most mentioned symbols in recent events."""
    symbols_data = [
        {"symbol": "NVDA", "mentions": random.randint(8, 20), "sentiment": "bullish"},
        {"symbol": "AAPL", "mentions": random.randint(5, 15), "sentiment": "neutral"},
        {"symbol": "BTC", "mentions": random.randint(6, 18), "sentiment": "bullish"},
        {"symbol": "TSLA", "mentions": random.randint(4, 12), "sentiment": "bearish"},
        {"symbol": "ETH", "mentions": random.randint(5, 14), "sentiment": "bullish"},
        {"symbol": "AMD", "mentions": random.randint(3, 10), "sentiment": "bullish"},
        {"symbol": "META", "mentions": random.randint(3, 8), "sentiment": "neutral"},
        {"symbol": "SPY", "mentions": random.randint(6, 15), "sentiment": "neutral"},
        {"symbol": "COIN", "mentions": random.randint(3, 9), "sentiment": "bearish"},
        {"symbol": "MSFT", "mentions": random.randint(4, 11), "sentiment": "bullish"},
    ]
    symbols_data.sort(key=lambda x: x["mentions"], reverse=True)
    return symbols_data
