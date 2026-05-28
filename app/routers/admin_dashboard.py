"""Super admin dashboard — users, subscriptions, AI costs, system health."""

from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser, Patient, Analysis, Subscription
from app.routers.auth import get_current_user

router = APIRouter()


def require_admin(user: AdminUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("/admin/overview")
def admin_overview(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    """Full system overview for super admin."""
    now = datetime.now(UTC)
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)

    total_users = db.query(func.count(AdminUser.id)).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_analyses = db.query(func.count(Analysis.id)).scalar() or 0
    month_analyses = db.query(func.count(Analysis.id)).filter(Analysis.created_at >= month_ago).scalar() or 0
    week_analyses = db.query(func.count(Analysis.id)).filter(Analysis.created_at >= week_ago).scalar() or 0

    # Subscriptions
    active_subs = db.query(func.count(Subscription.id)).filter(Subscription.status == "active").scalar() or 0
    total_revenue = db.query(func.sum(Subscription.reports_total * Subscription.price_per_report)).filter(
        Subscription.status.in_(["active", "expired"])
    ).scalar() or 0
    total_reports_used = db.query(func.sum(Subscription.reports_used)).scalar() or 0

    # AI costs estimate (YandexGPT ~0.5₽ per request)
    ai_cost = round(total_analyses * 0.5, 2)
    server_cost = 3400  # Monthly server
    total_cost = ai_cost + server_cost

    return {
        "users": {
            "total": total_users,
            "doctors": db.query(func.count(AdminUser.id)).filter(AdminUser.role == "doctor").scalar() or 0,
            "admins": db.query(func.count(AdminUser.id)).filter(AdminUser.role == "admin").scalar() or 0,
        },
        "patients": {"total": total_patients},
        "analyses": {
            "total": total_analyses,
            "this_month": month_analyses,
            "this_week": week_analyses,
        },
        "subscriptions": {
            "active": active_subs,
            "total_revenue": round(total_revenue, 2),
            "total_reports_used": total_reports_used,
        },
        "costs": {
            "ai_requests": total_analyses,
            "ai_cost_rub": ai_cost,
            "server_cost_rub": server_cost,
            "total_monthly_cost": total_cost,
        },
        "profit": round(total_revenue - total_cost, 2),
    }


@router.get("/admin/users")
def admin_users(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()
    result = []
    for u in users:
        sub = db.query(Subscription).filter(
            Subscription.user_id == u.id, Subscription.status == "active"
        ).first()
        analyses_count = db.query(func.count(Analysis.id)).scalar() or 0  # TODO: filter by user

        result.append({
            "id": u.id,
            "username": u.username,
            "fio": u.fio,
            "role": u.role,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "subscription": {
                "plan": sub.plan if sub else None,
                "reports_remaining": sub.reports_remaining if sub else 0,
                "reports_total": sub.reports_total if sub else 0,
            } if sub else None,
        })
    return result


@router.get("/admin/system")
def admin_system(user: AdminUser = Depends(require_admin)):
    """System health check."""
    import platform

    health = {
        "server": platform.node(),
        "python": platform.python_version(),
        "os": f"{platform.system()} {platform.release()}",
    }

    # Disk usage
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        health["disk"] = {
            "total_gb": round(total / (1024**3), 1),
            "used_gb": round(used / (1024**3), 1),
            "free_gb": round(free / (1024**3), 1),
            "percent": round(used / total * 100, 1),
        }
    except:
        pass

    # Redis check
    try:
        import redis
        r = redis.Redis()
        r.ping()
        health["redis"] = "connected"
    except:
        health["redis"] = "disconnected"

    # PostgreSQL check
    try:
        from app.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health["database"] = "connected"
    except:
        health["database"] = "unknown"

    return health
