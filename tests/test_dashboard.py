"""Tests for dashboard and statistics endpoints."""


def test_dashboard_empty(client, auth_headers):
    resp = client.get("/api/dashboard", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_analyses"] >= 0
    assert data["total_patients"] >= 0
    assert "avg_plaque" in data
    assert "today_analyses" in data
    assert isinstance(data["recent_analyses"], list)


def test_statistics(client, auth_headers):
    resp = client.get("/api/statistics", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["monthly"], list)
    assert len(data["monthly"]) == 12
    assert "distribution" in data
    assert "attention_needed" in data
    assert data["distribution"]["total"] >= 0


def test_patients_search_empty(client, auth_headers):
    resp = client.get("/api/patients/search?q=", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_patients_search_query(client, auth_headers):
    resp = client.get("/api/patients/search?q=Иванов", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_patient_history_not_found(client, auth_headers):
    resp = client.get("/api/patients/99999/history", headers=auth_headers)
    assert resp.status_code == 200
    assert "error" in resp.json()


def test_report_not_found(client):
    resp = client.get("/api/report/99999/pdf")
    assert resp.status_code == 404


def test_public_report_not_found(client):
    resp = client.get("/api/report/99999/public")
    assert resp.status_code == 404


def test_analysis_not_found_no_auth(client):
    resp = client.get("/api/analysis/99999")
    assert resp.status_code == 401


def test_analysis_not_found(client, auth_headers):
    resp = client.get("/api/analysis/99999", headers=auth_headers)
    assert resp.status_code == 404
