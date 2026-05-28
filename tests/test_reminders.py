"""Tests for reminder system."""


def test_reminders_pending_no_auth(client):
    resp = client.get("/api/reminders/pending")
    assert resp.status_code == 401


def test_reminders_pending_empty(client, auth_headers):
    resp = client.get("/api/reminders/pending", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_send_reminder_no_auth(client):
    resp = client.post("/api/reminder/send", json={"patient_id": 1})
    assert resp.status_code == 401


def test_send_reminder_patient_not_found(client, auth_headers):
    resp = client.post("/api/reminder/send", headers=auth_headers, json={
        "patient_id": 99999, "reminder_type": "planned",
    })
    assert resp.status_code == 404


def test_send_reminder_no_telegram(client, auth_headers, db_session):
    from app.models import Patient
    p = Patient(fio="No TG", card_number="NOTG01")
    db_session.add(p)
    db_session.commit()

    resp = client.post("/api/reminder/send", headers=auth_headers, json={
        "patient_id": p.id, "reminder_type": "planned",
    })
    assert resp.status_code == 400
    assert "Telegram" in resp.json()["detail"]
