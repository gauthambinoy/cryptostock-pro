"""
Portfolio metrics calculation service - eliminates code duplication
"""
from typing import Dict, List, Optional, Tuple
from ..schemas import QuoteResponse


def calculate_holding_metrics(holding, current_price: float) -> dict:
    """
    Calculate current value and gain/loss for a holding

    Args:
        holding: Holding database model instance
        current_price: Current market price of the asset

    Returns:
        Dict with current_price, current_value, gain_loss, gain_loss_percent
    """
    current_value = holding.quantity * current_price
    cost_basis = holding.quantity * holding.buy_price
    gain_loss = current_value - cost_basis
    gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0

    return {
        "current_price": current_price,
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_loss_percent": round(gain_loss_percent, 2)
    }


def calculate_portfolio_metrics(
    holdings: List,
    quotes: Dict[str, Optional[QuoteResponse]]
) -> Tuple[float, float, float, float]:
    """
    Calculate portfolio-level metrics from holdings and quotes

    Args:
        holdings: List of holding models
        quotes: Dict mapping symbol -> QuoteResponse

    Returns:
        Tuple of (total_value, total_invested, gain_loss, gain_loss_percent)
    """
    total_value = 0.0
    total_invested = 0.0

    for holding in holdings:
        quote = quotes.get(holding.symbol)
        price = quote.price if quote else holding.buy_price

        total_value += holding.quantity * price
        total_invested += holding.quantity * holding.buy_price

    gain_loss = total_value - total_invested
    gain_loss_percent = (gain_loss / total_invested * 100) if total_invested > 0 else 0

    return (
        round(total_value, 2),
        round(total_invested, 2),
        round(gain_loss, 2),
        round(gain_loss_percent, 2)
    )


def calculate_allocation(
    holdings: List,
    quotes: Dict[str, Optional[QuoteResponse]],
    total_value: float
) -> Dict[str, float]:
    """
    Calculate portfolio allocation percentages by asset

    Args:
        holdings: List of holding models
        quotes: Dict mapping symbol -> QuoteResponse
        total_value: Total portfolio value

    Returns:
        Dict mapping symbol -> allocation_percentage
    """
    allocation = {}

    for holding in holdings:
        quote = quotes.get(holding.symbol)
        price = quote.price if quote else holding.buy_price
        value = holding.quantity * price

        allocation[holding.symbol] = round(
            (value / total_value * 100) if total_value > 0 else 0,
            2
        )

    return allocation
