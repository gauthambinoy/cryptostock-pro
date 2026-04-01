"""
Unit tests for portfolio metrics service
"""
import pytest
from app.services.portfolio_metrics import (
    calculate_holding_metrics,
    calculate_portfolio_metrics,
    calculate_allocation,
)
from app.schemas import QuoteResponse, AssetType


def test_calculate_holding_metrics():
    """Test holding metrics calculation"""
    # Create a mock holding
    class MockHolding:
        quantity = 10
        buy_price = 150.0

    holding = MockHolding()
    current_price = 160.0

    metrics = calculate_holding_metrics(holding, current_price)

    assert metrics["current_price"] == 160.0
    assert metrics["current_value"] == 1600.0
    assert metrics["gain_loss"] == 100.0
    assert metrics["gain_loss_percent"] == 6.67


def test_calculate_holding_metrics_with_zero_buy_price():
    """Test holding metrics with zero buy price"""
    class MockHolding:
        quantity = 10
        buy_price = 0.0

    holding = MockHolding()
    current_price = 160.0

    metrics = calculate_holding_metrics(holding, current_price)

    assert metrics["gain_loss_percent"] == 0


def test_calculate_portfolio_metrics():
    """Test portfolio metrics calculation"""
    class MockHolding:
        def __init__(self, quantity, buy_price, symbol):
            self.quantity = quantity
            self.buy_price = buy_price
            self.symbol = symbol

    class MockQuote:
        def __init__(self, price):
            self.price = price

    holdings = [
        MockHolding(10, 150.0, "AAPL"),
        MockHolding(5, 200.0, "GOOGL"),
    ]

    quotes = {
        "AAPL": MockQuote(160.0),
        "GOOGL": MockQuote(210.0),
    }

    total_value, total_invested, gain_loss, gain_loss_percent = calculate_portfolio_metrics(
        holdings, quotes
    )

    assert total_value == 2650.0  # (10*160) + (5*210)
    assert total_invested == 2500.0  # (10*150) + (5*200)
    assert gain_loss == 150.0
    assert gain_loss_percent == 6.0


def test_calculate_allocation():
    """Test portfolio allocation calculation"""
    class MockHolding:
        def __init__(self, quantity, buy_price, symbol):
            self.quantity = quantity
            self.buy_price = buy_price
            self.symbol = symbol

    class MockQuote:
        def __init__(self, price):
            self.price = price

    holdings = [
        MockHolding(10, 150.0, "AAPL"),
        MockHolding(5, 200.0, "GOOGL"),
    ]

    quotes = {
        "AAPL": MockQuote(160.0),
        "GOOGL": MockQuote(210.0),
    }

    total_value = 2650.0

    allocation = calculate_allocation(holdings, quotes, total_value)

    assert allocation["AAPL"] == pytest.approx(60.38, 0.1)  # 1600/2650*100
    assert allocation["GOOGL"] == pytest.approx(39.62, 0.1)  # 1050/2650*100


def test_allocation_with_zero_total_value():
    """Test allocation calculation with zero total value"""
    class MockHolding:
        def __init__(self, quantity, buy_price, symbol):
            self.quantity = quantity
            self.buy_price = buy_price
            self.symbol = symbol

    class MockQuote:
        def __init__(self, price):
            self.price = price

    holdings = [
        MockHolding(10, 150.0, "AAPL"),
    ]

    quotes = {
        "AAPL": MockQuote(160.0),
    }

    allocation = calculate_allocation(holdings, quotes, 0.0)

    assert allocation["AAPL"] == 0.0
