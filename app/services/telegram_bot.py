"""Telegram bot for patient reminders."""

import httpx
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Analysis, Patient


BOT_TOKEN = getattr(settings, "telegram_bot_token", "")


async def send_message(chat_id: str, text: str) -> bool:
    """Send message via Telegram Bot API."""
    if not BOT_TOKEN:
        return False
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
            })
            return resp.status_code == 200
    except Exception:
        return False


async def send_reminder(patient: Patient, reminder_type: str, doctor_name: str = "", custom_text: str = ""):
    """Send hygiene reminder to patient.

    reminder_type: 'controlled' (2 weeks, high index) or 'planned' (regular schedule)
    """
    if not patient.telegram_id:
        return False

    if reminder_type == "controlled":
        text = (
            f"🦷 <b>Контролируемая гигиена</b>\n\n"
            f"Здравствуйте, {patient.fio}!\n\n"
            f"По результатам последнего анализа вам рекомендована контрольная проверка гигиены "
            f"через 2 недели.\n\n"
            f"{custom_text}\n\n"
            f"Врач: {doctor_name}\n"
            f"Запишитесь на приём: odontaindex.ru"
        )
    else:
        text = (
            f"🦷 <b>Плановая гигиена</b>\n\n"
            f"Здравствуйте, {patient.fio}!\n\n"
            f"Подошло время плановой профессиональной гигиены полости рта. "
            f"Врач ждёт вас!\n\n"
            f"{custom_text}\n\n"
            f"Врач: {doctor_name}\n"
            f"Запишитесь на приём: odontaindex.ru"
        )

    return await send_message(patient.telegram_id, text)


def get_patients_for_reminder(db: Session) -> list[dict]:
    """Get patients who need reminders."""
    results = []
    patients = db.query(Patient).all()

    for patient in patients:
        last_analysis = (
            db.query(Analysis)
            .filter(Analysis.patient_id == patient.id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        if not last_analysis or not last_analysis.created_at:
            continue

        days_since = (datetime.utcnow() - last_analysis.created_at).days
        plaque = last_analysis.plaque_pct_overall or 0

        # Controlled: 2 weeks for high index
        if plaque > 30 and 13 <= days_since <= 15:
            results.append({
                "patient": patient,
                "type": "controlled",
                "plaque": plaque,
                "days_since": days_since,
            })

        # Planned: based on plaque level
        if plaque <= 10 and 175 <= days_since <= 185:  # ~6 months
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days_since})
        elif plaque <= 25 and 115 <= days_since <= 125:  # ~4 months
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days_since})
        elif plaque <= 50 and 55 <= days_since <= 65:  # ~2 months
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days_since})
        elif plaque > 50 and 25 <= days_since <= 35:  # ~1 month
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days_since})

    return results
