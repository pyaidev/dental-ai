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


@celery.task(name="app.tasks.run_analysis_async")
def run_analysis_async(task_id: str, photo_paths: dict, analysis_id: int, user_id: int):
    """Run plaque detection + PDF generation in background."""
    from app.routers.async_analysis import update_progress
    from app.services.plaque_detector import detect_plaque
    from app.services.index_calculator import calculate_indices
    from app.services.pdf_generator import generate_pdf
    from app.models import Analysis, Patient, Doctor, Clinic
    from app.config import settings
    from pathlib import Path

    db = SessionLocal()
    try:
        update_progress(task_id, "processing", 10, "Анализ фотографий...")

        results = {}
        for i, (name, path) in enumerate(photo_paths.items()):
            overlay_path = str(Path(settings.results_dir) / f"{task_id}_{name}_overlay.jpg")
            results[name] = detect_plaque(path, overlay_path)
            update_progress(task_id, "processing", 20 + i * 20, f"Обработка: {name}")

        update_progress(task_id, "processing", 70, "Расчёт индексов...")

        pct_front = results["front"].plaque_percent
        pct_right = results["right"].plaque_percent
        pct_left = results["left"].plaque_percent
        pct_overall = round((pct_front + pct_right + pct_left) / 3, 1)

        indices = calculate_indices(pct_front, pct_right, pct_left)

        update_progress(task_id, "processing", 85, "Генерация PDF...")

        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.plaque_pct_front = pct_front
            analysis.plaque_pct_right = pct_right
            analysis.plaque_pct_left = pct_left
            analysis.plaque_pct_overall = pct_overall
            analysis.index_fedorov = indices.fedorov_volodkina
            analysis.index_api_lange = indices.api_lange
            analysis.index_ohi_s = indices.ohi_s
            analysis.index_silness_loe = indices.silness_loe
            analysis.index_php = indices.php
            analysis.overlay_front = results["front"].overlay_path
            analysis.overlay_right = results["right"].overlay_path
            analysis.overlay_left = results["left"].overlay_path
            db.commit()

        update_progress(task_id, "completed", 100, "Готово!", {
            "analysis_id": analysis_id,
            "plaque_pct_overall": pct_overall,
        })

    except Exception as e:
        update_progress(task_id, "error", 0, str(e))
    finally:
        db.close()
