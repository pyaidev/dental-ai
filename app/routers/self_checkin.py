"""QR self-checkin: patient fills questionnaire on their phone."""

import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, PatientQuestionnaire, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


class SelfCheckinData(BaseModel):
    smoking: bool = False
    diabetes: bool = False
    pregnancy: bool = False
    dry_mouth: bool = False
    bruxism: bool = False
    brushing_frequency: str = Field("2x", pattern="^(1x|2x|3x|rarely)$")
    uses_interdental: bool = False
    bleeding_gums: bool = False
    sensitivity: bool = False
    wants_whitening: bool = False
    satisfied_color: bool = True
    bad_breath: bool = False
    food_impaction: bool = False
    coffee_tea: bool = False
    sweets: bool = False
    notes: str = Field("", max_length=500)


@router.post("/checkin/generate/{patient_id}")
def generate_checkin_qr(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate unique checkin token for patient QR code."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    token = secrets.token_urlsafe(24)
    # Store token temporarily (reuse phone field with prefix)
    # In production, use Redis with TTL
    patient.checkin_token = token
    db.commit()

    return {
        "token": token,
        "url": f"https://odontaindex.ru/checkin/{token}",
        "patient_fio": patient.fio,
    }


@router.get("/checkin/{token}")
def get_checkin_info(token: str, db: Session = Depends(get_db)):
    """Public: get patient info by checkin token (no auth)."""
    patient = db.query(Patient).filter(Patient.checkin_token == token).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Ссылка недействительна")

    # Get existing questionnaire
    q = db.query(PatientQuestionnaire).filter(
        PatientQuestionnaire.patient_id == patient.id
    ).first()

    return {
        "patient_fio": patient.fio,
        "card_number": patient.card_number,
        "has_existing": q is not None,
    }


@router.post("/checkin/{token}")
def submit_checkin(token: str, body: SelfCheckinData, db: Session = Depends(get_db)):
    """Public: patient submits questionnaire via QR (no auth)."""
    patient = db.query(Patient).filter(Patient.checkin_token == token).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Ссылка недействительна")

    existing = db.query(PatientQuestionnaire).filter(
        PatientQuestionnaire.patient_id == patient.id
    ).first()

    data = body.model_dump()
    if existing:
        for k, v in data.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
    else:
        q = PatientQuestionnaire(patient_id=patient.id, **{k: v for k, v in data.items() if hasattr(PatientQuestionnaire, k)})
        db.add(q)

    # Invalidate token after use
    patient.checkin_token = None
    db.commit()

    return {"ok": True, "message": "Спасибо! Анкета заполнена. Врач увидит ваши ответы."}
