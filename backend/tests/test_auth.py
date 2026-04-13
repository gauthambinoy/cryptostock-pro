"""
Authentication tests — covers registration, login, token handling, and security
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_user(client):
    response = client.post("/api/auth/register", json={
        "email": "test@quantumledger.ai",
        "username": "testuser",
        "password": "SecurePass123!",
        "full_name": "Test User"
    })
    return response.json()


class TestRegistration:
    def test_register_success(self, client):
        response = client.post("/api/auth/register", json={
            "email": "new@quantumledger.ai",
            "username": "newuser",
            "password": "StrongPass123!",
            "full_name": "New User"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@quantumledger.ai"
        assert data["username"] == "newuser"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client, test_user):
        response = client.post("/api/auth/register", json={
            "email": "test@quantumledger.ai",
            "username": "different",
            "password": "StrongPass123!",
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_duplicate_username(self, client, test_user):
        response = client.post("/api/auth/register", json={
            "email": "different@quantumledger.ai",
            "username": "testuser",
            "password": "StrongPass123!",
        })
        assert response.status_code == 400
        assert "already taken" in response.json()["detail"]

    def test_register_weak_password(self, client):
        response = client.post("/api/auth/register", json={
            "email": "weak@quantumledger.ai",
            "username": "weakuser",
            "password": "short",
        })
        assert response.status_code == 422

    def test_register_invalid_email(self, client):
        response = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "username": "emailtest",
            "password": "StrongPass123!",
        })
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client, test_user):
        response = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        assert response.status_code == 200
        assert "access_token" in response.cookies

    def test_login_json_success(self, client, test_user):
        response = client.post("/api/auth/login/json", json={
            "email": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        assert response.status_code == 200
        assert "access_token" in response.cookies

    def test_login_wrong_password(self, client, test_user):
        response = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "WrongPassword123!",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/auth/login", data={
            "username": "nobody@quantumledger.ai",
            "password": "SomePass123!",
        })
        assert response.status_code == 401


class TestProtectedRoutes:
    def test_get_me_authenticated(self, client, test_user):
        login = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        cookies = login.cookies
        response = client.get("/api/auth/me", cookies=cookies)
        assert response.status_code == 200
        assert response.json()["email"] == "test@quantumledger.ai"

    def test_get_me_unauthenticated(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_logout(self, client, test_user):
        login = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        response = client.post("/api/auth/logout", cookies=login.cookies)
        assert response.status_code == 200


class TestGuestLogin:
    def test_guest_login(self, client):
        response = client.post("/api/auth/guest")
        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert response.json()["message"] == "Guest login successful"


class TestChangePassword:
    def test_change_password_success(self, client, test_user):
        login = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        response = client.post(
            "/api/auth/change-password",
            params={"current_password": "SecurePass123!", "new_password": "NewSecurePass456!"},
            cookies=login.cookies,
        )
        assert response.status_code == 200

    def test_change_password_wrong_current(self, client, test_user):
        login = client.post("/api/auth/login", data={
            "username": "test@quantumledger.ai",
            "password": "SecurePass123!",
        })
        response = client.post(
            "/api/auth/change-password",
            params={"current_password": "WrongPass!", "new_password": "NewSecurePass456!"},
            cookies=login.cookies,
        )
        assert response.status_code == 400
