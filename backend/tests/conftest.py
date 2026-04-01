"""
Shared pytest fixtures and configuration
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app import models


@pytest.fixture(scope="function")
def db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def sample_user(db):
    """Create a sample user for testing"""
    user = models.User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_123",
        full_name="Test User",
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def sample_portfolio(db, sample_user):
    """Create a sample portfolio for testing"""
    portfolio = models.Portfolio(
        name="Test Portfolio",
        user_id=sample_user.id,
    )
    db.add(portfolio)
    db.commit()
    return portfolio


@pytest.fixture
def sample_holdings(db, sample_portfolio):
    """Create sample holdings for testing"""
    holdings = [
        models.Holding(
            portfolio_id=sample_portfolio.id,
            symbol="AAPL",
            name="Apple Inc.",
            asset_type=models.AssetType.STOCK,
            quantity=10,
            buy_price=150.0,
            buy_date=datetime.utcnow() - timedelta(days=30),
        ),
        models.Holding(
            portfolio_id=sample_portfolio.id,
            symbol="BTC",
            name="Bitcoin",
            asset_type=models.AssetType.CRYPTO,
            quantity=0.5,
            buy_price=40000.0,
            buy_date=datetime.utcnow() - timedelta(days=60),
        ),
    ]
    for holding in holdings:
        db.add(holding)
    db.commit()
    return holdings
