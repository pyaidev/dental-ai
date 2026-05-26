"""Tests for authentication endpoints."""


def test_login_success(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401
    assert "Неверный" in resp.json()["detail"]


def test_login_wrong_username(client):
    resp = client.post("/api/auth/login", json={"username": "nouser", "password": "admin123"})
    assert resp.status_code == 401


def test_login_empty_body(client):
    resp = client.post("/api/auth/login", json={})
    assert resp.status_code == 422


def test_me_with_token(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


def test_me_without_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token_123"})
    assert resp.status_code == 401


def test_dashboard_without_auth(client):
    resp = client.get("/api/dashboard")
    assert resp.status_code == 401


def test_patients_without_auth(client):
    resp = client.get("/api/patients/search?q=test")
    assert resp.status_code == 401


def test_statistics_without_auth(client):
    resp = client.get("/api/statistics")
    assert resp.status_code == 401
