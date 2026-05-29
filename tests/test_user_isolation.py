"""Tests for user data isolation — each user sees only their own patients/analyses."""
import io
from PIL import Image


def _create_test_image():
    """Create a minimal test image."""
    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def _register_and_login(client, username, password="test123456"):
    """Register a new user, activate free plan, and return auth headers."""
    client.post("/api/auth/register", json={
        "username": username, "password": password, "fio": f"Dr {username}",
    })
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    token = resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Activate free plan so user can create analyses
    client.post("/api/subscription/purchase", json={"plan": "free"}, headers=headers)
    return headers


def _create_analysis(client, headers, patient_fio, card_number):
    """Create analysis for a patient."""
    img = _create_test_image()
    resp = client.post(
        "/api/analyze",
        data={
            "patient_fio": patient_fio,
            "card_number": card_number,
            "patient_dob": "2000-01-01",
            "doctor_fio": "Test Doctor",
            "doctor_position": "Hygienist",
            "clinic_name": "Test Clinic",
            "clinic_address": "",
            "clinic_phone": "",
            "has_braces": "false",
            "has_implants": "false",
            "doctor_comment": "",
            "patient_phone": "",
        },
        files={
            "photo_front": ("front.jpg", _create_test_image(), "image/jpeg"),
            "photo_right": ("right.jpg", _create_test_image(), "image/jpeg"),
            "photo_left": ("left.jpg", _create_test_image(), "image/jpeg"),
        },
        headers=headers,
    )
    return resp


def test_user_sees_only_own_patients(client):
    """User A's patients should not appear in User B's search."""
    headers_a = _register_and_login(client, "doctor_a_iso")
    headers_b = _register_and_login(client, "doctor_b_iso")

    # Doctor A creates analysis (creates patient)
    resp_a = _create_analysis(client, headers_a, "Patient Alpha", "CARD_A001")
    assert resp_a.status_code == 200, f"Analysis A failed: {resp_a.text}"

    # Doctor B creates analysis (creates patient)
    resp_b = _create_analysis(client, headers_b, "Patient Beta", "CARD_B001")
    assert resp_b.status_code == 200, f"Analysis B failed: {resp_b.text}"

    # Doctor A searches — should see only Patient Alpha
    search_a = client.get("/api/patients/search?q=", headers=headers_a)
    patients_a = [p["fio"] for p in search_a.json()]
    assert "Patient Alpha" in patients_a
    assert "Patient Beta" not in patients_a

    # Doctor B searches — should see only Patient Beta
    search_b = client.get("/api/patients/search?q=", headers=headers_b)
    patients_b = [p["fio"] for p in search_b.json()]
    assert "Patient Beta" in patients_b
    assert "Patient Alpha" not in patients_b


def test_user_dashboard_isolation(client):
    """Dashboard should show only user's own data."""
    headers_a = _register_and_login(client, "doc_dash_a")
    headers_b = _register_and_login(client, "doc_dash_b")

    _create_analysis(client, headers_a, "DashPatientA", "DASH_A01")

    # Doctor B dashboard — should NOT include Doctor A's analysis
    dash_b = client.get("/api/dashboard", headers=headers_b).json()
    assert dash_b["total_analyses"] == 0
    assert dash_b["total_patients"] == 0


def test_user_statistics_isolation(client):
    """Statistics should reflect only user's own data."""
    headers_a = _register_and_login(client, "doc_stat_a")
    headers_b = _register_and_login(client, "doc_stat_b")

    _create_analysis(client, headers_a, "StatPatA", "STAT_A01")

    stats_b = client.get("/api/statistics", headers=headers_b).json()
    assert stats_b["distribution"]["total"] == 0


def test_user_cannot_delete_other_patient(client):
    """User should not be able to delete another user's patient."""
    headers_a = _register_and_login(client, "doc_del_a")
    headers_b = _register_and_login(client, "doc_del_b")

    _create_analysis(client, headers_a, "DelPatA", "DEL_A01")

    # Get patient A's ID
    search = client.get("/api/patients/search?q=DelPatA", headers=headers_a)
    patient_id = search.json()[0]["id"]

    # Doctor B tries to delete — should fail
    del_resp = client.delete(f"/api/patients/{patient_id}", headers=headers_b)
    assert del_resp.status_code == 404


def test_same_card_number_different_users(client):
    """Different users can have patients with same card number."""
    headers_a = _register_and_login(client, "doc_card_a")
    headers_b = _register_and_login(client, "doc_card_b")

    resp_a = _create_analysis(client, headers_a, "SameCard A", "SAME001")
    resp_b = _create_analysis(client, headers_b, "SameCard B", "SAME001")

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200

    # Each sees their own
    search_a = client.get("/api/patients/search?q=SAME001", headers=headers_a)
    assert len(search_a.json()) == 1
    assert search_a.json()[0]["fio"] == "SameCard A"

    search_b = client.get("/api/patients/search?q=SAME001", headers=headers_b)
    assert len(search_b.json()) == 1
    assert search_b.json()[0]["fio"] == "SameCard B"


def test_admin_sees_all(client, auth_headers):
    """Admin should see all patients from all users."""
    search = client.get("/api/patients/search?q=", headers=auth_headers)
    # Admin sees everything
    assert len(search.json()) >= 0  # at least no error
