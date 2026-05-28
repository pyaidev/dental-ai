"""Tests for subscription system."""


def test_get_plans(client):
    resp = client.get("/api/plans")
    assert resp.status_code == 200
    data = resp.json()
    assert "plans" in data
    assert "hygiene" in data["plans"]
    assert "all" in data["plans"]
    assert data["plans"]["hygiene"]["price"] == 35
    assert data["plans"]["all"]["price"] == 60
    assert "permissions" in data["plans"]["hygiene"]


def test_subscription_no_auth(client):
    resp = client.get("/api/subscription")
    assert resp.status_code == 401


def test_subscription_empty(client, auth_headers):
    resp = client.get("/api/subscription", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["active"] == False
    assert data["reports_remaining"] == 0
    assert data["permissions"] == []


def test_purchase_subscription(client, auth_headers):
    resp = client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "hygiene_brushes", "quantity": 50})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_price"] == 2000  # 40 * 50
    assert data["status"] == "active"


def test_subscription_active_after_purchase(client, auth_headers):
    # Purchase first
    client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "hygiene", "quantity": 10})
    resp = client.get("/api/subscription", headers=auth_headers)
    data = resp.json()
    assert data["active"] == True
    assert data["reports_remaining"] == 10
    assert "analysis" in data["permissions"]


def test_subscription_permissions_hygiene(client, auth_headers):
    client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "hygiene", "quantity": 10})
    resp = client.get("/api/subscription", headers=auth_headers)
    data = resp.json()
    assert "analysis" in data["permissions"]
    assert "interdental" not in data["permissions"]
    assert "periodontal" not in data["permissions"]
    assert "whitening" not in data["permissions"]


def test_subscription_permissions_all(client, auth_headers):
    client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "all", "quantity": 10})
    resp = client.get("/api/subscription", headers=auth_headers)
    data = resp.json()
    assert "interdental" in data["permissions"]
    assert "periodontal" in data["permissions"]
    assert "whitening" in data["permissions"]


def test_purchase_invalid_plan(client, auth_headers):
    resp = client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "invalid_plan", "quantity": 10})
    assert resp.status_code in (400, 422)


def test_purchase_invalid_quantity(client, auth_headers):
    resp = client.post("/api/subscription/purchase", headers=auth_headers,
        json={"plan": "hygiene", "quantity": 3})  # min 10
    assert resp.status_code in (400, 422)
