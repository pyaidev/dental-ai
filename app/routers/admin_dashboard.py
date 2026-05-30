"""Super admin dashboard — users, subscriptions, AI costs, system health."""

from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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


# ── User Management ──

@router.post("/admin/users/{user_id}/block")
def block_user(user_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot block admin")
    target.role = "blocked"
    db.commit()
    return {"ok": True, "message": f"User {target.username} blocked"}


@router.post("/admin/users/{user_id}/unblock")
def unblock_user(user_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = "doctor"
    db.commit()
    return {"ok": True, "message": f"User {target.username} unblocked"}


class AssignPlanRequest(BaseModel):
    plan: str
    reports: int = 100


@router.post("/admin/users/{user_id}/assign-plan")
def assign_plan(user_id: int, body: AssignPlanRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Expire old active subs
    old_subs = db.query(Subscription).filter(Subscription.user_id == user_id, Subscription.status == "active").all()
    for s in old_subs:
        s.status = "expired"
    # Create new
    import uuid
    sub = Subscription(
        user_id=user_id,
        plan=body.plan,
        reports_total=body.reports,
        reports_used=0,
        price_per_report=0,
        payment_id=f"admin_{uuid.uuid4().hex[:8]}",
        status="active",
    )
    db.add(sub)
    db.commit()
    return {"ok": True, "message": f"Plan {body.plan} assigned to {target.username} with {body.reports} reports"}


# ── Reviews CRUD ──

@router.get("/reviews")
def get_public_reviews(db: Session = Depends(get_db)):
    """Public endpoint for landing page reviews."""
    from app.models import Review
    reviews = db.query(Review).order_by(Review.id.desc()).all()
    return [{"id": r.id, "name": r.name, "role": r.role, "quote": r.quote, "stars": r.stars} for r in reviews]


@router.get("/admin/reviews")
def get_reviews(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    reviews = db.query(Review).order_by(Review.id.desc()).all()
    return [{"id": r.id, "name": r.name, "role": r.role, "quote": r.quote, "stars": r.stars} for r in reviews]


class ReviewRequest(BaseModel):
    name: str
    role: str
    quote: str
    stars: int = 5

@router.post("/admin/reviews")
def create_review(body: ReviewRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    review = Review(name=body.name, role=body.role, quote=body.quote, stars=body.stars)
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"id": review.id, "name": review.name, "role": review.role, "quote": review.quote, "stars": review.stars}


@router.put("/admin/reviews/{review_id}")
def update_review(review_id: int, body: ReviewRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.name = body.name
    review.role = body.role
    review.quote = body.quote
    review.stars = body.stars
    db.commit()
    return {"id": review.id, "name": review.name, "role": review.role, "quote": review.quote, "stars": review.stars}


@router.delete("/admin/reviews/{review_id}")
def delete_review(review_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"ok": True}


# ── Plans Management ──

@router.get("/admin/plans")
def get_admin_plans(user: AdminUser = Depends(require_admin)):
    from app.routers.subscriptions import PLANS
    return {"plans": PLANS}


class PlanUpdateRequest(BaseModel):
    price: int
    reports_limit: int
    features: list[str]

@router.put("/admin/plans/{plan_key}")
def update_plan(plan_key: str, body: PlanUpdateRequest, user: AdminUser = Depends(require_admin)):
    from app.routers.subscriptions import PLANS
    if plan_key not in PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    PLANS[plan_key]["price"] = body.price
    PLANS[plan_key]["reports_limit"] = body.reports_limit
    PLANS[plan_key]["features"] = body.features
    return {"ok": True, "plan": PLANS[plan_key]}


# ── Celery Tasks ──

@router.get("/admin/celery")
def get_celery_status(user: AdminUser = Depends(require_admin)):
    result = {"status": "unknown", "workers": [], "scheduled": [], "active": []}
    try:
        from app.celery_app import celery_app
        inspect = celery_app.control.inspect(timeout=2)
        active = inspect.active() or {}
        scheduled = inspect.scheduled() or {}
        registered = inspect.registered() or {}
        result["status"] = "connected"
        for worker, tasks in active.items():
            result["workers"].append(worker)
            for t in tasks:
                result["active"].append({"id": t["id"], "name": t["name"], "worker": worker})
        for worker, tasks in scheduled.items():
            for t in tasks:
                result["scheduled"].append({"name": t.get("request", {}).get("name", "?"), "eta": t.get("eta"), "worker": worker})
    except Exception as e:
        result["status"] = f"error: {str(e)[:100]}"
    # Redis queue length
    try:
        import redis
        r = redis.Redis()
        result["queue_length"] = r.llen("celery")
    except:
        result["queue_length"] = 0
    return result
