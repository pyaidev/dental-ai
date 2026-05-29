"""Tests for subscription limits and paywalls."""
import io
from PIL import Image


def _create_test_image():
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def _register_and_login(client, username):
    client.post("/api/auth/register", json={
        "username": username, "password": "test123456", "fio": f"Dr {username}",
    })
    resp = client.post("/api/auth/login", json={"username": username, "password": "test123456"})
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def test_free_plan_activation(client):
    """User can activate free plan."""
    headers = _register_and_login(client, "free_user_1")
    resp = client.post("/api/subscription/purchase", json={"plan": "free"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["total_price"] == 0


def test_subscription_info(client):
    """After activating plan, subscription endpoint returns correct info."""
    headers = _register_and_login(client, "sub_info_user")
    client.post("/api/subscription/purchase", json={"plan": "free"}, headers=headers)

    resp = client.get("/api/subscription", headers=headers)
    data = resp.json()
    assert data["active"] is True
    assert data["reports_total"] == 5
    assert data["reports_remaining"] == 5
    assert "analysis" in data["permissions"]


def test_no_subscription_returns_402(client):
    """User without subscription gets 402 when analyzing."""
    headers = _register_and_login(client, "no_sub_user")

    resp = client.post(
        "/api/analyze",
        data={
            "patient_fio": "Test", "card_number": "NS001", "patient_dob": "2000-01-01",
            "doctor_fio": "Doc", "doctor_position": "Hyg", "clinic_name": "Cl",
            "clinic_address": "", "clinic_phone": "", "has_braces": "false",
            "has_implants": "false", "doctor_comment": "", "patient_phone": "",
        },
        files={
            "photo_front": ("f.jpg", _create_test_image(), "image/jpeg"),
            "photo_right": ("r.jpg", _create_test_image(), "image/jpeg"),
            "photo_left": ("l.jpg", _create_test_image(), "image/jpeg"),
        },
        headers=headers,
    )
    assert resp.status_code == 402
    assert "Лимит" in resp.json()["detail"]


def test_interdental_permission_denied(client):
    """Free plan user cannot access interdental chart."""
    headers = _register_and_login(client, "free_inter_user")
    client.post("/api/subscription/purchase", json={"plan": "free"}, headers=headers)

    resp = client.post("/api/interdental", json={
        "patient_id": 999, "data": {"11-12": "0.4mm"}, "brand": "curaprox",
    }, headers=headers)
    assert resp.status_code == 403


def test_plans_endpoint(client):
    """Plans endpoint returns all plans."""
    resp = client.get("/api/plans")
    assert resp.status_code == 200
    plans = resp.json()["plans"]
    assert "free" in plans
    assert "start" in plans
    assert "pro" in plans
    assert "clinic" in plans
    assert "expert" in plans
    assert plans["free"]["price"] == 0
    assert plans["pro"]["price"] == 2990


def test_admin_unlimited(client, auth_headers):
    """Admin has unlimited access."""
    resp = client.get("/api/subscription", headers=auth_headers)
    data = resp.json()
    assert data["active"] is True
    assert data["reports_remaining"] == 999999
    assert "analysis" in data["permissions"]
    assert "interdental" in data["permissions"]
    assert "periodontal" in data["permissions"]
