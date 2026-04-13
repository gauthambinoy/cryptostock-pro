"""
Health check and API info endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthCheck:
    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_api_info(self, client):
        response = client.get("/api")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "QuantumLedger"
        assert "endpoints" in data
        assert "auth" in data["endpoints"]
        assert "portfolio" in data["endpoints"]
        assert "market" in data["endpoints"]

    def test_docs_available(self, client):
        response = client.get("/docs")
        assert response.status_code == 200

    def test_security_headers(self, client):
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"


class TestCORS:
    def test_cors_preflight(self, client):
        response = client.options(
            "/api/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            }
        )
        assert response.status_code == 200
