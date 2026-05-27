from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientQuestionnaire, Patient, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


class QuestionnaireRequest(BaseModel):
    patient_id: int
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
    notes: str = Field("", max_length=1000)


@router.post("/questionnaire")
def save_questionnaire(
    body: QuestionnaireRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(PatientQuestionnaire).filter(
        PatientQuestionnaire.patient_id == body.patient_id
    ).first()

    if existing:
        for k, v in body.model_dump(exclude={"patient_id"}).items():
            setattr(existing, k, v)
        q = existing
    else:
        q = PatientQuestionnaire(**body.model_dump())
        db.add(q)

    db.commit()
    db.refresh(q)
    return _to_dict(q)


@router.get("/questionnaire/{patient_id}")
def get_questionnaire(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PatientQuestionnaire).filter(
        PatientQuestionnaire.patient_id == patient_id
    ).order_by(PatientQuestionnaire.created_at.desc()).first()
    if not q:
        return {"exists": False}
    return {**_to_dict(q), "exists": True}


def _to_dict(q: PatientQuestionnaire) -> dict:
    return {
        "id": q.id,
        "patient_id": q.patient_id,
        "smoking": q.smoking,
        "diabetes": q.diabetes,
        "pregnancy": q.pregnancy,
        "dry_mouth": q.dry_mouth,
        "bruxism": q.bruxism,
        "brushing_frequency": q.brushing_frequency,
        "uses_interdental": q.uses_interdental,
        "bleeding_gums": q.bleeding_gums,
        "sensitivity": q.sensitivity,
        "wants_whitening": q.wants_whitening,
        "satisfied_color": q.satisfied_color,
        "bad_breath": q.bad_breath,
        "notes": q.notes,
    }
