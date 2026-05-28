"""Tests for patient questionnaire."""


def test_questionnaire_no_auth(client):
    resp = client.post("/api/questionnaire", json={"patient_id": 1})
    assert resp.status_code == 401


def test_questionnaire_not_found(client, auth_headers):
    resp = client.get("/api/questionnaire/99999", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["exists"] == False


def test_questionnaire_save_and_get(client, auth_headers, db_session):
    # Create patient first
    from app.models import Patient
    p = Patient(fio="Test Q", card_number="Q001")
    db_session.add(p)
    db_session.commit()

    # Save questionnaire
    resp = client.post("/api/questionnaire", headers=auth_headers, json={
        "patient_id": p.id,
        "smoking": True,
        "diabetes": False,
        "pregnancy": False,
        "dry_mouth": True,
        "bruxism": False,
        "brushing_frequency": "1x",
        "uses_interdental": False,
        "bleeding_gums": True,
        "sensitivity": True,
        "wants_whitening": False,
        "satisfied_color": True,
        "bad_breath": True,
        "notes": "Test notes",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["smoking"] == True
    assert data["dry_mouth"] == True
    assert data["bleeding_gums"] == True

    # Get questionnaire
    resp2 = client.get(f"/api/questionnaire/{p.id}", headers=auth_headers)
    assert resp2.status_code == 200
    assert resp2.json()["exists"] == True
    assert resp2.json()["smoking"] == True


def test_questionnaire_update(client, auth_headers, db_session):
    from app.models import Patient
    p = Patient(fio="Test Q2", card_number="Q002")
    db_session.add(p)
    db_session.commit()

    # Save
    client.post("/api/questionnaire", headers=auth_headers, json={
        "patient_id": p.id, "smoking": False, "brushing_frequency": "2x",
    })
    # Update
    resp = client.post("/api/questionnaire", headers=auth_headers, json={
        "patient_id": p.id, "smoking": True, "brushing_frequency": "1x",
    })
    assert resp.status_code == 200
    assert resp.json()["smoking"] == True
    assert resp.json()["brushing_frequency"] == "1x"
