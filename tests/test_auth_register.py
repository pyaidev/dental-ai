"""Tests for doctor registration."""


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "username": "doctor_test",
        "password": "test123456",
        "fio": "Тестовый Врач",
        "clinic_name": "Тест Клиника",
        "phone": "+7 999 123-45-67",
        "position": "Гигиенист",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["username"] == "doctor_test"
    assert data["user"]["role"] == "doctor"


def test_register_duplicate(client):
    # First registration
    client.post("/api/auth/register", json={
        "username": "dup_user", "password": "test123456", "fio": "Dup",
    })
    # Duplicate
    resp = client.post("/api/auth/register", json={
        "username": "dup_user", "password": "test123456", "fio": "Dup",
    })
    assert resp.status_code == 400
    assert "занят" in resp.json()["detail"]


def test_register_short_password(client):
    resp = client.post("/api/auth/register", json={
        "username": "short_pw", "password": "123", "fio": "Test",
    })
    assert resp.status_code == 422


def test_register_empty_username(client):
    resp = client.post("/api/auth/register", json={
        "username": "", "password": "test123456", "fio": "Test",
    })
    assert resp.status_code == 422


def test_change_password(client, auth_headers):
    resp = client.post("/api/auth/change-password", headers=auth_headers,
        json={"old_password": "admin123", "new_password": "newpass123"})
    assert resp.status_code == 200
    assert resp.json()["ok"] == True


def test_change_password_wrong_old(client, auth_headers):
    resp = client.post("/api/auth/change-password", headers=auth_headers,
        json={"old_password": "wrong_pass", "new_password": "newpass123"})
    assert resp.status_code == 400
