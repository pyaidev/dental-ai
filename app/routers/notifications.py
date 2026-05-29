"""In-app notifications for users."""

from datetime import datetime, UTC
from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser, Subscription, Analysis, Patient
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/notifications")
def get_notifications(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for current user."""
    notifs = []

    # 1. Subscription alerts
    if user.role != "admin":
        sub = db.query(Subscription).filter(
            Subscription.user_id == user.id,
        ).order_by(desc(Subscription.created_at)).first()

        if not sub:
            notifs.append({
                "type": "warning",
                "icon": "credit-card",
                "title": "Нет подписки",
                "message": "Оформите подписку для создания отчётов",
                "action": "/subscription",
                "time": None,
            })
        elif sub.status == "expired":
            notifs.append({
                "type": "danger",
                "icon": "alert-triangle",
                "title": "Подписка истекла",
                "message": f"Использовано {sub.reports_used}/{sub.reports_total} отчётов. Пополните баланс.",
                "action": "/subscription",
                "time": sub.created_at.isoformat() if sub.created_at else None,
            })
        elif sub.status == "active" and sub.reports_remaining <= 5:
            notifs.append({
                "type": "warning",
                "icon": "alert-circle",
                "title": f"Осталось {sub.reports_remaining} отчётов",
                "message": "Скоро закончатся отчёты. Рекомендуем пополнить.",
                "action": "/subscription",
                "time": None,
            })
        elif sub.status == "pending":
            notifs.append({
                "type": "info",
                "icon": "clock",
                "title": "Ожидание оплаты",
                "message": "Оплата ещё не подтверждена. Если вы оплатили — подождите 1-2 минуты.",
                "action": "/subscription",
                "time": sub.created_at.isoformat() if sub.created_at else None,
            })
        elif sub.status == "active":
            notifs.append({
                "type": "success",
                "icon": "check-circle",
                "title": "Подписка активна",
                "message": f"Осталось {sub.reports_remaining} отчётов из {sub.reports_total}",
                "action": None,
                "time": None,
            })

    # 2. Recent analyses (user's own patients only)
    if user.role == "admin":
        recent = db.query(Analysis).order_by(desc(Analysis.created_at)).limit(3).all()
    else:
        my_pids = [p.id for p in db.query(Patient.id).filter(Patient.user_id == user.id).all()]
        recent = db.query(Analysis).filter(Analysis.patient_id.in_(my_pids)).order_by(desc(Analysis.created_at)).limit(3).all() if my_pids else []
    for a in recent:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        if a.created_at and (datetime.now(UTC) - a.created_at.replace(tzinfo=UTC)).days < 1:
            notifs.append({
                "type": "info",
                "icon": "file-text",
                "title": f"Новый анализ: {patient.fio if patient else '—'}",
                "message": f"Налёт: {a.plaque_pct_overall}%",
                "action": f"/analyze?view={a.id}",
                "time": a.created_at.isoformat() if a.created_at else None,
            })

    # 3. Patients needing attention (high plaque, user's own)
    if user.role == "admin":
        high_plaque = db.query(Analysis).filter(Analysis.plaque_pct_overall > 50).order_by(desc(Analysis.created_at)).limit(2).all()
    else:
        high_plaque = db.query(Analysis).filter(Analysis.plaque_pct_overall > 50, Analysis.patient_id.in_(my_pids)).order_by(desc(Analysis.created_at)).limit(2).all() if my_pids else []
    for a in high_plaque:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        notifs.append({
            "type": "warning",
            "icon": "activity",
            "title": f"Высокий налёт: {patient.fio if patient else '—'}",
            "message": f"{a.plaque_pct_overall}% — рекомендован контроль",
            "action": "/patients",
            "time": a.created_at.isoformat() if a.created_at else None,
        })

    return {"notifications": notifs, "unread": len([n for n in notifs if n["type"] in ("warning", "danger")])}
