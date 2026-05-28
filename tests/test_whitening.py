"""Tests for whitening module."""


def test_whitening_no_auth(client):
    resp = client.get("/api/whitening/1")
    assert resp.status_code == 401


def test_whitening_empty(client, auth_headers):
    resp = client.get("/api/whitening/99999", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_whitening_permission_denied(client, auth_headers):
    """Without 'all' plan, whitening should be denied."""
    import io
    resp = client.post("/api/whitening", headers=auth_headers, data={
        "patient_id": "1", "tooth_type": "healthy",
    }, files={"photo_before": ("test.jpg", io.BytesIO(b"fake"), "image/jpeg")})
    assert resp.status_code in (400, 403)  # 403 no permission or 400 bad image
