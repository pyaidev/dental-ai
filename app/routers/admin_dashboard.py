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


# ── User Detail ──

@router.get("/admin/users/{user_id}")
def admin_user_detail(user_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404)

    patients_count = db.query(func.count(Patient.id)).filter(Patient.user_id == user_id).scalar() or 0
    analyses_count = db.query(func.count(Analysis.id)).join(Patient).filter(Patient.user_id == user_id).scalar() or 0

    subs = db.query(Subscription).filter(Subscription.user_id == user_id).order_by(Subscription.created_at.desc()).all()
    sub_list = [{"id": s.id, "plan": s.plan, "status": s.status, "reports_used": s.reports_used, "reports_total": s.reports_total, "created_at": s.created_at.isoformat() if s.created_at else None} for s in subs]

    recent = db.query(Analysis).join(Patient).filter(Patient.user_id == user_id).order_by(Analysis.created_at.desc()).limit(5).all()
    recent_list = []
    for a in recent:
        p = db.query(Patient).filter(Patient.id == a.patient_id).first()
        recent_list.append({"id": a.id, "patient": p.fio if p else "—", "plaque": a.plaque_pct_overall, "date": a.created_at.strftime("%d.%m.%Y") if a.created_at else ""})

    return {
        "id": target.id, "username": target.username, "fio": target.fio, "role": target.role,
        "is_verified": target.is_verified,
        "created_at": target.created_at.isoformat() if target.created_at else None,
        "last_login": target.last_login.isoformat() if target.last_login else None,
        "patients_count": patients_count, "analyses_count": analyses_count,
        "subscriptions": sub_list, "recent_analyses": recent_list,
    }


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
    reviews = db.query(Review).order_by(Review.order.asc(), Review.id.asc()).all()
    return [{"id": r.id, "name": r.name, "role": r.role, "quote": r.quote, "stars": r.stars, "order": r.order} for r in reviews]


@router.get("/admin/reviews")
def get_reviews(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    reviews = db.query(Review).order_by(Review.order.asc(), Review.id.asc()).all()
    return [{"id": r.id, "name": r.name, "role": r.role, "quote": r.quote, "stars": r.stars, "order": r.order} for r in reviews]


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


class ReorderRequest(BaseModel):
    ids: list[int]


@router.put("/admin/reviews/reorder")
def reorder_reviews(body: ReorderRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    for idx, review_id in enumerate(body.ids):
        db.query(Review).filter(Review.id == review_id).update({"order": idx})
    db.commit()
    return {"ok": True}


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
    return {"id": review.id, "name": review.name, "role": review.role, "quote": review.quote, "stars": review.stars, "order": review.order}


@router.delete("/admin/reviews/{review_id}")
def delete_review(review_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Review
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"ok": True}


# ── Ambassadors CRUD ──

@router.get("/ambassadors")
def get_public_ambassadors(db: Session = Depends(get_db)):
    from app.models import Ambassador
    items = db.query(Ambassador).order_by(Ambassador.order.asc(), Ambassador.id.asc()).all()
    return [{"id": a.id, "name": a.name, "role": a.role, "quote": a.quote, "order": a.order} for a in items]

@router.get("/admin/ambassadors")
def get_ambassadors(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Ambassador
    items = db.query(Ambassador).order_by(Ambassador.order.asc(), Ambassador.id.asc()).all()
    return [{"id": a.id, "name": a.name, "role": a.role, "quote": a.quote, "order": a.order} for a in items]

class AmbassadorRequest(BaseModel):
    name: str
    role: str
    quote: str

@router.post("/admin/ambassadors")
def create_ambassador(body: AmbassadorRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Ambassador
    a = Ambassador(name=body.name, role=body.role, quote=body.quote)
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "name": a.name, "role": a.role, "quote": a.quote, "order": a.order}

@router.put("/admin/ambassadors/reorder")
def reorder_ambassadors(body: ReorderRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Ambassador
    for idx, amb_id in enumerate(body.ids):
        db.query(Ambassador).filter(Ambassador.id == amb_id).update({"order": idx})
    db.commit()
    return {"ok": True}

@router.put("/admin/ambassadors/{amb_id}")
def update_ambassador(amb_id: int, body: AmbassadorRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Ambassador
    a = db.query(Ambassador).filter(Ambassador.id == amb_id).first()
    if not a: raise HTTPException(status_code=404)
    a.name = body.name; a.role = body.role; a.quote = body.quote
    db.commit()
    return {"id": a.id, "name": a.name, "role": a.role, "quote": a.quote, "order": a.order}

@router.delete("/admin/ambassadors/{amb_id}")
def delete_ambassador(amb_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import Ambassador
    a = db.query(Ambassador).filter(Ambassador.id == amb_id).first()
    if not a: raise HTTPException(status_code=404)
    db.delete(a)
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

PLANS_OVERRIDE_PATH = "/opt/dental-ai/data/plans_override.json"


def _save_plans_override(plans: dict) -> None:
    import json, os
    os.makedirs(os.path.dirname(PLANS_OVERRIDE_PATH), exist_ok=True)
    with open(PLANS_OVERRIDE_PATH, "w", encoding="utf-8") as f:
        json.dump(plans, f, ensure_ascii=False, indent=2)


@router.put("/admin/plans/{plan_key}")
def update_plan(plan_key: str, body: PlanUpdateRequest, user: AdminUser = Depends(require_admin)):
    import json
    from app.routers.subscriptions import PLANS
    if plan_key not in PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    PLANS[plan_key]["price"] = body.price
    PLANS[plan_key]["reports_limit"] = body.reports_limit
    PLANS[plan_key]["features"] = body.features
    # Persist override: save only overridden fields for each plan
    try:
        override: dict = {}
        try:
            import os
            if os.path.exists(PLANS_OVERRIDE_PATH):
                with open(PLANS_OVERRIDE_PATH, "r", encoding="utf-8") as f:
                    override = json.load(f)
        except Exception:
            override = {}
        override[plan_key] = {
            "price": body.price,
            "reports_limit": body.reports_limit,
            "features": body.features,
        }
        _save_plans_override(override)
    except Exception:
        pass  # Don't fail the request if file write fails
    return {"ok": True, "plan": PLANS[plan_key]}


# ── Site Settings ──

_DEFAULT_SITE_SETTINGS = {
    "hero": {
        "badge": "Используют 50+ стоматологий",
        "title": "AI-анализ гигиены",
        "title_gradient": "полости рта",
        "subtitle": "Загрузите фото зубов — нейросеть определит налёт, рассчитает индексы и подберёт средства гигиены за 30 секунд",
        "cta_primary": "Попробовать бесплатно",
        "cta_secondary": "Как это работает",
    },
    "features": [
        {"title": "AI-анализ налёта", "desc": "Нейросеть YOLOv8 определяет зоны налёта по фото с индикатором"},
        {"title": "5 индексов гигиены", "desc": "Фёдорова-Володкиной, API Lange, OHI-S, Silness-Löe, PHP"},
        {"title": "PDF-отчёты", "desc": "Профессиональные отчёты с QR-кодом для пациента"},
        {"title": "Telegram + Max", "desc": "Автоматические напоминания пациентам о визитах"},
        {"title": "Ёршикограмма", "desc": "Интерактивная карта межзубных промежутков"},
        {"title": "Пародонтограмма", "desc": "Глубина карманов, кровоточивость, подвижность"},
    ],
    "steps": [
        {"num": "01", "title": "Загрузите фото", "desc": "3 фотографии зубов с индикатором налёта"},
        {"num": "02", "title": "AI анализирует", "desc": "Нейросеть определяет налёт и рассчитывает индексы"},
        {"num": "03", "title": "Получите отчёт", "desc": "PDF с рекомендациями по средствам гигиены"},
        {"num": "04", "title": "Отправьте пациенту", "desc": "Через Telegram, Max или email — в один клик"},
    ],
    "stats": [
        {"value": 5, "suffix": "", "label": "индексов гигиены"},
        {"value": 30, "suffix": " сек", "label": "на анализ"},
        {"value": 95, "suffix": "%", "label": "точность AI"},
    ],
    "cta": {
        "title": "Начните анализировать",
        "title_line2": "уже сегодня",
        "subtitle": "Регистрация бесплатна. Первые 5 отчётов — в подарок.",
        "button": "Создать аккаунт",
    },
    "footer": {
        "company": "ИП Коростелев Александр Андреевич",
        "inn": "312334497069",
        "ogrnip": "323508100020560",
        "address": "140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2",
        "copyright": "© 2026 Odonta Index AI",
    },
}


def _get_or_create_settings(db: Session):
    import json
    from app.models import SiteSettings
    row = db.query(SiteSettings).first()
    if not row:
        row = SiteSettings(
            hero=json.dumps(_DEFAULT_SITE_SETTINGS["hero"], ensure_ascii=False),
            features=json.dumps(_DEFAULT_SITE_SETTINGS["features"], ensure_ascii=False),
            steps=json.dumps(_DEFAULT_SITE_SETTINGS["steps"], ensure_ascii=False),
            stats=json.dumps(_DEFAULT_SITE_SETTINGS["stats"], ensure_ascii=False),
            cta=json.dumps(_DEFAULT_SITE_SETTINGS["cta"], ensure_ascii=False),
            footer=json.dumps(_DEFAULT_SITE_SETTINGS["footer"], ensure_ascii=False),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _row_to_dict(row) -> dict:
    import json
    return {
        "hero": json.loads(row.hero or "{}"),
        "features": json.loads(row.features or "[]"),
        "steps": json.loads(row.steps or "[]"),
        "stats": json.loads(row.stats or "[]"),
        "cta": json.loads(row.cta or "{}"),
        "footer": json.loads(row.footer or "{}"),
    }


@router.get("/site-settings")
def get_public_site_settings(db: Session = Depends(get_db)):
    """Public endpoint — returns all landing content."""
    row = _get_or_create_settings(db)
    return _row_to_dict(row)


@router.get("/admin/site-settings")
def get_admin_site_settings(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    row = _get_or_create_settings(db)
    return _row_to_dict(row)


class SiteSettingsRequest(BaseModel):
    hero: dict | None = None
    features: list | None = None
    steps: list | None = None
    stats: list | None = None
    cta: dict | None = None
    footer: dict | None = None


@router.put("/admin/site-settings")
def update_site_settings(body: SiteSettingsRequest, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    import json
    from app.models import SiteSettings
    row = _get_or_create_settings(db)
    if body.hero is not None:
        row.hero = json.dumps(body.hero, ensure_ascii=False)
    if body.features is not None:
        row.features = json.dumps(body.features, ensure_ascii=False)
    if body.steps is not None:
        row.steps = json.dumps(body.steps, ensure_ascii=False)
    if body.stats is not None:
        row.stats = json.dumps(body.stats, ensure_ascii=False)
    if body.cta is not None:
        row.cta = json.dumps(body.cta, ensure_ascii=False)
    if body.footer is not None:
        row.footer = json.dumps(body.footer, ensure_ascii=False)
    row.updated_at = __import__("datetime").datetime.utcnow()
    db.commit()
    return _row_to_dict(row)


# ── Celery Tasks ──

@router.get("/admin/celery")
def get_celery_status(user: AdminUser = Depends(require_admin)):
    result = {"status": "unknown", "workers": [], "scheduled": [], "active": []}
    try:
        from app.celery_app import celery
        inspect = celery.control.inspect(timeout=2)
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
