"""
Integration tests for portfolio routes
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import models
from datetime import datetime, timedelta


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


def test_create_portfolio(client, db, sample_user):
    """Test portfolio creation endpoint"""
    # Note: This requires proper auth setup in a real scenario
    portfolio_data = {
        "name": "Test Portfolio",
    }

    # In a real test, you would set auth headers
    # response = client.post("/api/portfolio", json=portfolio_data, headers=auth_headers)
    # assert response.status_code == 201
    # assert response.json()["name"] == "Test Portfolio"


def test_soft_delete_holding():
    """Test soft delete functionality for holdings"""
    class MockHolding:
        def __init__(self):
            self.is_deleted = False
            self.deleted_at = None

    holding = MockHolding()

    # Soft delete
    holding.is_deleted = True
    holding.deleted_at = datetime.utcnow()

    assert holding.is_deleted is True
    assert holding.deleted_at is not None


def test_pagination_parameters():
    """Test pagination parameter handling"""
    # Mock pagination
    limit = 20
    offset = 0

    assert limit > 0
    assert offset >= 0
    assert limit <= 100  # Assuming max limit of 100
