from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


def _user_analysis_query(db, user):
    """Return Analysis query filtered by user's patients."""
    if user.role == "admin":
        return db.query(Analysis)
    my_patient_ids = [p.id for p in db.query(Patient.id).filter(Patient.user_id == user.id).all()]
    if not my_patient_ids:
        return db.query(Analysis).filter(Analysis.id == -1)  # empty
    return db.query(Analysis).filter(Analysis.patient_id.in_(my_patient_ids))


@router.get("/statistics")
def get_statistics(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base_q = _user_analysis_query(db, user)

    # Monthly analysis counts for last 12 months
    now = datetime.utcnow()
    monthly_data = []
    for i in range(11, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_start = datetime(y, m, 1)
        if m == 12:
            month_end = datetime(y + 1, 1, 1)
        else:
            month_end = datetime(y, m + 1, 1)

        count = base_q.filter(Analysis.created_at >= month_start, Analysis.created_at < month_end).count()
        avg_plaque = base_q.filter(
            Analysis.created_at >= month_start, Analysis.created_at < month_end
        ).with_entities(func.avg(Analysis.plaque_pct_overall)).scalar()

        monthly_data.append({
            "month": month_start.strftime("%Y-%m"),
            "month_name": month_start.strftime("%b %Y"),
            "count": count,
            "avg_plaque": round(avg_plaque, 1) if avg_plaque else 0,
        })

    # Plaque distribution
    total = base_q.count()
    good = base_q.filter(Analysis.plaque_pct_overall <= 10).count()
    ok = base_q.filter(Analysis.plaque_pct_overall > 10, Analysis.plaque_pct_overall <= 30).count()
    bad = base_q.filter(Analysis.plaque_pct_overall > 30, Analysis.plaque_pct_overall <= 50).count()
    critical = base_q.filter(Analysis.plaque_pct_overall > 50).count()

    # Top patients needing attention
    worst = base_q.order_by(Analysis.plaque_pct_overall.desc()).limit(5).all()
    attention_list = []
    for a in worst:
        p = db.query(Patient).filter(Patient.id == a.patient_id).first()
        if p:
            attention_list.append({
                "patient_fio": p.fio,
                "card_number": p.card_number,
                "plaque_pct": a.plaque_pct_overall,
                "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            })

    return {
        "monthly": monthly_data,
        "distribution": {
            "good": good,
            "satisfactory": ok,
            "unsatisfactory": bad,
            "poor": critical,
            "total": total,
        },
        "attention_needed": attention_list,
    }
