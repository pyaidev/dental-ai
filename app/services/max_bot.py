"""Max messenger bot for patient reminders."""

import logging
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Patient

logger = logging.getLogger(__name__)

MAX_API = "https://platform-api.max.ru"
MAX_TOKEN = getattr(settings, "max_bot_token", "")


async def max_send_message(chat_id: str, text: str) -> bool:
    if not MAX_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{MAX_API}/messages",
                headers={"Authorization": MAX_TOKEN},
                json={"chat_id": chat_id, "text": text},
            )
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Max send error: {e}")
        return False


async def max_get_updates(marker: int = 0) -> dict:
    if not MAX_TOKEN:
        return {"updates": []}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{MAX_API}/updates",
                headers={"Authorization": MAX_TOKEN},
                params={"marker": marker, "timeout": 25},
            )
            return resp.json()
    except Exception:
        return {"updates": []}


async def max_handle_message(chat_id: str, text: str, user_id: str, db: Session):
    """Handle incoming message from Max bot."""
    if text == "/start":
        await max_send_message(chat_id,
            "🦷 Odonta Index AI\n\n"
            "Для подключения напоминаний отправьте ваш номер телефона "
            "(в формате +7XXXXXXXXXX)")
        return

    if text == "/stop":
        patient = db.query(Patient).filter(Patient.max_id == str(chat_id)).first()
        if patient:
            patient.max_id = None
            db.commit()
            await max_send_message(chat_id, "🔕 Уведомления отключены.")
        return

    if text == "/status":
        from app.models import Analysis
        patient = db.query(Patient).filter(Patient.max_id == str(chat_id)).first()
        if not patient:
            await max_send_message(chat_id, "Вы не подключены. Отправьте /start")
            return
        last = db.query(Analysis).filter(Analysis.patient_id == patient.id).order_by(Analysis.created_at.desc()).first()
        if last:
            await max_send_message(chat_id,
                f"📊 Последний анализ\nПациент: {patient.fio}\n"
                f"Налёт: {last.plaque_pct_overall}%\n"
                f"Дата: {last.created_at.strftime('%d.%m.%Y') if last.created_at else '—'}")
        return

    # Try to match phone number
    clean = text.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if clean.isdigit() and len(clean) >= 10:
        patients = db.query(Patient).all()
        for p in patients:
            if p.phone:
                p_clean = p.phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
                if p_clean.endswith(clean[-10:]) or clean.endswith(p_clean[-10:]):
                    p.max_id = str(chat_id)
                    db.commit()
                    await max_send_message(chat_id,
                        f"✅ Подключено!\nПациент: {p.fio}\nКарта: {p.card_number}\n\n"
                        f"Вы будете получать напоминания о визитах.\n/stop — отключить")
                    return
        await max_send_message(chat_id, "❌ Пациент не найден. Проверьте номер.")
        return

    await max_send_message(chat_id,
        "🦷 Odonta Index AI\n\nКоманды:\n/start — подключить\n/status — последний анализ\n/stop — отключить")


async def max_send_reminder(patient: Patient, reminder_type: str, custom_text: str = "") -> bool:
    if not patient.max_id:
        return False
    if reminder_type == "controlled":
        text = f"🦷 Контролируемая гигиена\n\nЗдравствуйте, {patient.fio}!\nРекомендован контрольный визит.\n{custom_text}"
    else:
        text = f"🦷 Плановая гигиена\n\nЗдравствуйте, {patient.fio}!\nПодошло время профессиональной гигиены.\n{custom_text}"
    return await max_send_message(patient.max_id, text)
