"""
Transaction endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_cookies(client):
    client.post("/api/auth/register", json={
        "email": "trader@quantumledger.ai",
        "username": "trader",
        "password": "TradePass123!",
    })
    login = client.post("/api/auth/login", data={
        "username": "trader@quantumledger.ai",
        "password": "TradePass123!",
    })
    return login.cookies


class TestTransactions:
    def test_get_transactions_empty(self, client, auth_cookies):
        response = client.get("/api/transactions/", cookies=auth_cookies)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_transactions_unauthenticated(self, client):
        response = client.get("/api/transactions/")
        assert response.status_code == 401

    def test_transaction_summary(self, client, auth_cookies):
        response = client.get("/api/transactions/summary", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert "total_buys" in data
        assert "total_sells" in data
        assert "net_invested" in data

    def test_export_transactions(self, client, auth_cookies):
        response = client.get("/api/transactions/export", cookies=auth_cookies)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
