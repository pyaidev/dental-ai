from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_analyses = db.query(func.count(Analysis.id)).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).scalar() or 0

    avg_plaque = db.query(func.avg(Analysis.plaque_pct_overall)).scalar()
    avg_plaque = round(avg_plaque, 1) if avg_plaque else 0

    today = datetime.utcnow().date()
    today_analyses = (
        db.query(func.count(Analysis.id))
        .filter(func.date(Analysis.created_at) == today)
        .scalar() or 0
    )

    recent = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )

    recent_list = []
    for a in recent:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        recent_list.append({
            "id": a.id,
            "patient_fio": patient.fio if patient else "—",
            "card_number": patient.card_number if patient else "",
            "plaque_pct_overall": a.plaque_pct_overall or 0,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        })

    return {
        "total_analyses": total_analyses,
        "total_patients": total_patients,
        "avg_plaque": avg_plaque,
        "today_analyses": today_analyses,
        "recent_analyses": recent_list,
    }
