import hashlib
import uuid
from datetime import datetime, timedelta, UTC

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Subscription, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()

# Plans: price per report
PLANS = {
    "hygiene": {
        "name": "Гигиена", "price": 35,
        "features": ["Анализ налёта", "5 индексов", "PDF-отчёт"],
        "permissions": ["analysis", "indices", "pdf", "questionnaire"],
    },
    "hygiene_brushes": {
        "name": "Гигиена + Ёршики", "price": 40,
        "features": ["Анализ налёта", "5 индексов", "Ёршикограмма", "PDF-отчёт"],
        "permissions": ["analysis", "indices", "pdf", "questionnaire", "interdental"],
    },
    "hygiene_perio": {
        "name": "Гигиена + Ёршики + Пародонтограмма", "price": 50,
        "features": ["Анализ налёта", "5 индексов", "Ёршикограмма", "Пародонтограмма", "PDF-отчёт"],
        "permissions": ["analysis", "indices", "pdf", "questionnaire", "interdental", "periodontal"],
    },
    "all": {
        "name": "Полный пакет", "price": 60,
        "features": ["Анализ налёта", "5 индексов", "Ёршикограмма", "Пародонтограмма", "Отбеливание", "PDF-отчёт"],
        "permissions": ["analysis", "indices", "pdf", "questionnaire", "interdental", "periodontal", "whitening"],
    },
}

PACKAGES = [10, 50, 100]


def check_permission(user_id: int, feature: str, db: Session) -> bool:
    """Check if user's plan includes a feature. Admin = unlimited."""
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if user and user.role == "admin":
        return True
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active",
    ).order_by(Subscription.created_at.desc()).first()
    if not sub:
        return False
    plan_info = PLANS.get(sub.plan, {})
    return feature in plan_info.get("permissions", [])


class PurchaseRequest(BaseModel):
    plan: str = Field(..., pattern="^(hygiene|hygiene_brushes|hygiene_perio|all)$")
    quantity: int = Field(..., ge=10, le=1000)


@router.get("/plans")
def get_plans():
    return {"plans": PLANS, "packages": PACKAGES}


@router.get("/subscription")
def my_subscription(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "admin":
        return {
            "active": True, "plan": "admin", "plan_name": "Администратор ∞",
            "reports_total": 999999, "reports_used": 0, "reports_remaining": 999999,
            "price_per_report": 0, "status": "active",
            "permissions": ["analysis", "indices", "pdf", "questionnaire", "interdental", "periodontal", "whitening"],
        }

    sub = db.query(Subscription).filter(
        Subscription.user_id == user.id,
        Subscription.status == "active",
    ).order_by(Subscription.created_at.desc()).first()

    if not sub:
        return {"active": False, "reports_remaining": 0, "permissions": []}

    plan_info = PLANS.get(sub.plan, {})
    return {
        "active": True,
        "plan": sub.plan,
        "plan_name": plan_info.get("name", sub.plan),
        "reports_total": sub.reports_total,
        "reports_used": sub.reports_used,
        "reports_remaining": sub.reports_remaining,
        "price_per_report": sub.price_per_report,
        "status": sub.status,
        "permissions": plan_info.get("permissions", []),
    }


@router.post("/subscription/purchase")
async def purchase(
    body: PurchaseRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan_info = PLANS.get(body.plan)
    if not plan_info:
        raise HTTPException(status_code=400, detail="Invalid plan")

    total_price = plan_info["price"] * body.quantity
    order_id = f"odonta_{user.id}_{uuid.uuid4().hex[:8]}"

    # Create Tinkoff payment
    # TODO: Replace with real Tinkoff terminal key
    terminal_key = settings.tinkoff_terminal_key if hasattr(settings, 'tinkoff_terminal_key') else ""

    if terminal_key:
        payment_url = await _create_tinkoff_payment(terminal_key, order_id, total_price, body.plan, body.quantity)
    else:
        # Demo mode — auto-activate
        payment_url = None

    sub = Subscription(
        user_id=user.id,
        plan=body.plan,
        reports_total=body.quantity,
        reports_used=0,
        price_per_report=plan_info["price"],
        payment_id=order_id,
        status="active" if not payment_url else "pending",
    )
    db.add(sub)
    db.commit()

    return {
        "order_id": order_id,
        "total_price": total_price,
        "payment_url": payment_url,
        "status": sub.status,
        "message": f"Подписка активирована: {body.quantity} отчётов по {plan_info['price']}₽" if not payment_url else "Перейдите к оплате",
    }


@router.post("/subscription/use")
def use_report(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deduct 1 report from active subscription."""
    sub = db.query(Subscription).filter(
        Subscription.user_id == user.id,
        Subscription.status == "active",
    ).order_by(Subscription.created_at.desc()).first()

    if not sub or sub.reports_remaining <= 0:
        raise HTTPException(status_code=402, detail="Нет доступных отчётов. Пополните подписку.")

    sub.reports_used += 1
    db.commit()
    return {"reports_remaining": sub.reports_remaining, "reports_used": sub.reports_used}


def _generate_tinkoff_token(data: dict) -> str:
    """Generate Tinkoff API token: SHA256 of sorted values concatenated with Password."""
    import hashlib
    password = settings.tinkoff_password
    token_data = {**data, "Password": password}
    # Sort by key, concatenate values
    sorted_values = "".join(str(token_data[k]) for k in sorted(token_data.keys()))
    return hashlib.sha256(sorted_values.encode()).hexdigest()


async def _create_tinkoff_payment(terminal_key: str, order_id: str, amount: int, plan: str, qty: int) -> str:
    """Create payment via Tinkoff API v2."""
    url = "https://securepay.tinkoff.ru/v2/Init"
    amount_kopecks = amount * 100

    data = {
        "TerminalKey": terminal_key,
        "Amount": amount_kopecks,
        "OrderId": order_id,
        "Description": f"Odonta Index AI — {qty} отчётов ({plan})",
        "SuccessURL": "https://odontaindex.ru/subscription?status=success",
        "FailURL": "https://odontaindex.ru/subscription?status=fail",
        "NotificationURL": "https://odontaindex.ru/api/subscription/tinkoff-webhook",
    }
    data["Token"] = _generate_tinkoff_token(data)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=data)
        resp.raise_for_status()
        result = resp.json()
        if result.get("Success"):
            return result["PaymentURL"]
        raise Exception(result.get("Message", "Payment error"))


@router.post("/subscription/tinkoff-webhook")
async def tinkoff_webhook(request: Request, db: Session = Depends(get_db)):
    """Tinkoff payment notification webhook.
    Called by Tinkoff when payment status changes.
    """
    import hashlib
    body = await request.json()

    order_id = body.get("OrderId", "")
    status = body.get("Status", "")
    success = body.get("Success", False)

    if status == "CONFIRMED" and success:
        sub = db.query(Subscription).filter(
            Subscription.payment_id == order_id,
            Subscription.status == "pending",
        ).first()
        if sub:
            sub.status = "active"
            db.commit()
            return {"status": "OK"}

    if status in ("REJECTED", "REVERSED", "REFUNDED"):
        sub = db.query(Subscription).filter(
            Subscription.payment_id == order_id,
        ).first()
        if sub:
            sub.status = "cancelled"
            db.commit()

    return {"status": "OK"}
