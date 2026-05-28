"""Tests for interdental and periodontal charts."""


def test_interdental_no_auth(client):
    resp = client.get("/api/interdental/1")
    assert resp.status_code == 401


def test_interdental_empty(client, auth_headers):
    resp = client.get("/api/interdental/99999", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("exists") == False


def test_periodontal_no_auth(client):
    resp = client.get("/api/periodontal/1")
    assert resp.status_code == 401


def test_periodontal_empty(client, auth_headers):
    resp = client.get("/api/periodontal/99999", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("exists") == False


def test_interdental_permission_denied(client, auth_headers):
    """Without subscription, interdental save should be denied."""
    resp = client.post("/api/interdental", headers=auth_headers, json={
        "patient_id": 1, "data": {"11-12": "0.5mm"}, "notes": "",
    })
    assert resp.status_code in (403, 404)


def test_periodontal_permission_denied(client, auth_headers):
    resp = client.post("/api/periodontal", headers=auth_headers, json={
        "patient_id": 1, "data": {"11": {"buccal": [3,3,3], "lingual": [3,3,3], "bleeding": False, "mobility": 0}}, "notes": "",
    })
    assert resp.status_code in (403, 404)
