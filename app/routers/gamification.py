from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, PatientQuestionnaire, AdminUser
from app.routers.auth import get_current_user
from app.services.gamification import calculate_hygiene_score, get_patient_streak, generate_score_message

router = APIRouter()


@router.get("/score/{patient_id}")
def get_hygiene_score(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    last_analysis = (
        db.query(Analysis)
        .filter(Analysis.patient_id == patient_id)
        .order_by(Analysis.created_at.desc())
        .first()
    )

    plaque = last_analysis.plaque_pct_overall if last_analysis else 50

    q = db.query(PatientQuestionnaire).filter(
        PatientQuestionnaire.patient_id == patient_id
    ).first()
    q_data = None
    if q:
        q_data = {
            "brushing_frequency": q.brushing_frequency,
            "uses_interdental": q.uses_interdental,
            "cleans_tongue": getattr(q, "cleans_tongue", False),
            "uses_irrigator": getattr(q, "uses_irrigator", False),
            "smoking": q.smoking,
            "bleeding_gums": q.bleeding_gums,
        }

    score = calculate_hygiene_score(plaque, q_data)
    streak = get_patient_streak(patient_id, db)
    message = generate_score_message(patient, score, streak)

    return {
        **score,
        **streak,
        "message": message,
        "patient_fio": patient.fio,
        "plaque_pct": plaque,
    }
