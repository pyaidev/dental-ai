"""Tests for analysis correction endpoint."""


def test_correct_nonexistent(client, auth_headers):
    resp = client.put(
        "/api/analysis/99999/correct",
        json={"plaque_pct_front": 10},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_correct_without_auth(client):
    resp = client.put("/api/analysis/1/correct", json={"plaque_pct_front": 10})
    assert resp.status_code == 401
