"""Celery background tasks."""

import shutil
import asyncio
from datetime import datetime, UTC
from pathlib import Path

from app.celery_app import celery
from app.database import SessionLocal
from app.models import Subscription
from app.services.telegram_bot import get_patients_for_reminder, send_reminder


@celery.task(name="app.tasks.send_daily_reminders")
def send_daily_reminders():
    """Send Telegram reminders to patients who need them."""
    db = SessionLocal()
    try:
        items = get_patients_for_reminder(db)
        sent = 0
        for item in items:
            if item["patient"].telegram_id:
                ok = asyncio.run(send_reminder(item["patient"], item["type"]))
                if ok:
                    sent += 1
        return {"checked": len(items), "sent": sent}
    finally:
        db.close()


@celery.task(name="app.tasks.check_expired_subscriptions")
def check_expired_subscriptions():
    """Deactivate expired subscriptions."""
    db = SessionLocal()
    try:
        expired = db.query(Subscription).filter(
            Subscription.status == "active",
            Subscription.reports_used >= Subscription.reports_total,
        ).all()

        count = 0
        for sub in expired:
            sub.status = "expired"
            count += 1

        db.commit()
        return {"expired": count}
    finally:
        db.close()


@celery.task(name="app.tasks.backup_database")
def backup_database():
    """Daily backup of SQLite database."""
    src = Path("data/plaque.db")
    if not src.exists():
        return {"status": "no database"}

    backup_dir = Path("data/backups")
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    dst = backup_dir / f"plaque_{timestamp}.db"
    shutil.copy2(src, dst)

    # Keep only last 7 backups
    backups = sorted(backup_dir.glob("plaque_*.db"))
    for old in backups[:-7]:
        old.unlink()

    return {"backup": str(dst), "size": dst.stat().st_size}
