import json
from datetime import datetime, timedelta

import redis
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, AdminUser
from app.routers.auth import get_current_user

try:
    _redis = redis.Redis(host="localhost", port=6379, db=2, decode_responses=True)
    _redis.ping()
except Exception:
    _redis = None

CACHE_TTL = 300  # 5 minutes

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Try cache first
    if _redis:
        cached = _redis.get(f"dashboard:{user.id}")
        if cached:
            return json.loads(cached)

    # Filter by user (admin sees all)
    if user.role == "admin":
        patient_q = db.query(Patient)
        analysis_q = db.query(Analysis)
    else:
        patient_q = db.query(Patient).filter(Patient.user_id == user.id)
        my_patient_ids = [p.id for p in patient_q.all()]
        analysis_q = db.query(Analysis).filter(Analysis.patient_id.in_(my_patient_ids)) if my_patient_ids else db.query(Analysis).filter(Analysis.id == -1)

    total_analyses = analysis_q.count()
    total_patients = patient_q.count()

    avg_plaque = analysis_q.with_entities(func.avg(Analysis.plaque_pct_overall)).scalar()
    avg_plaque = round(avg_plaque, 1) if avg_plaque else 0

    today = datetime.utcnow().date()
    today_analyses = analysis_q.filter(func.date(Analysis.created_at) == today).count()

    recent = analysis_q.order_by(Analysis.created_at.desc()).limit(10).all()

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

    result = {
        "total_analyses": total_analyses,
        "total_patients": total_patients,
        "avg_plaque": avg_plaque,
        "today_analyses": today_analyses,
        "recent_analyses": recent_list,
    }

    # Cache result
    if _redis:
        try:
            _redis.setex(f"dashboard:{user.id}", CACHE_TTL, json.dumps(result))
        except Exception:
            pass

    return result
