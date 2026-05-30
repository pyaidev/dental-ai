"""Telegram bot for patient reminders with phone verification."""

import logging
import httpx
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Analysis, Patient

logger = logging.getLogger(__name__)

BOT_TOKEN = getattr(settings, "telegram_bot_token", "")
WEBAPP_URL = getattr(settings, "webapp_url", "https://odontaindex.ru")


async def send_message(chat_id: str, text: str, reply_markup: dict | None = None) -> bool:
    if not BOT_TOKEN:
        return False
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return False


async def request_phone(chat_id: str) -> bool:
    """Ask user to share phone number for verification."""
    return await send_message(
        chat_id,
        "🦷 <b>Odonta Index AI</b>\n\n"
        "Для получения напоминаний о гигиене, пожалуйста, поделитесь номером телефона.\n\n"
        "Нажмите кнопку ниже 👇",
        reply_markup={
            "keyboard": [[{
                "text": "📱 Отправить номер телефона",
                "request_contact": True,
            }]],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        },
    )


async def handle_start(chat_id: str, user_name: str) -> bool:
    """Handle /start command — show welcome info first, then request phone."""
    greeting = user_name if user_name else "пациент"
    await send_message(
        chat_id,
        f"🦷 <b>Добро пожаловать в Odonta Index AI!</b>\n\n"
        f"Здравствуйте, {greeting}! 👋\n\n"
        f"Я — бот сервиса <b>Odonta Index AI</b> для анализа гигиены полости рта.\n\n"
        f"<b>Что я умею:</b>\n"
        f"📊 Отправлять результаты анализов\n"
        f"🔔 Напоминать о плановой гигиене\n"
        f"📋 Показывать историю визитов\n"
        f"📄 Отправлять PDF-отчёты\n\n"
        f"<b>Команды:</b>\n"
        f"/start — подключить уведомления\n"
        f"/status — последний анализ\n"
        f"/stop — отключить уведомления\n\n"
        f"🌐 <a href='https://odontaindex.ru'>odontaindex.ru</a>\n\n"
        f"Для начала поделитесь номером телефона — "
        f"так я найду вашу карту пациента 👇",
        reply_markup={
            "keyboard": [[{
                "text": "📱 Отправить номер телефона",
                "request_contact": True,
            }]],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        },
    )
    return True


async def handle_contact(chat_id: str, phone: str, db: Session) -> bool:
    """Handle shared contact — link patient by phone number."""
    # Normalize phone: remove +, spaces, dashes
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    # Try find patient by phone
    patient = None
    patients = db.query(Patient).all()
    for p in patients:
        if p.phone:
            p_clean = p.phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            if p_clean == clean_phone or p_clean.endswith(clean_phone[-10:]) or clean_phone.endswith(p_clean[-10:]):
                patient = p
                break

    if patient:
        patient.telegram_id = str(chat_id)
        db.commit()
        await send_message(
            chat_id,
            f"✅ <b>Вы подключены!</b>\n\n"
            f"Пациент: {patient.fio}\n"
            f"Карта: {patient.card_number}\n\n"
            f"Теперь вы будете получать:\n"
            f"• Напоминания о плановой гигиене\n"
            f"• Контрольные визиты\n"
            f"• Результаты анализов\n\n"
            f"Для отключения напишите /stop",
            reply_markup={"remove_keyboard": True},
        )
        return True
    else:
        await send_message(
            chat_id,
            "❌ Пациент с таким номером не найден.\n\n"
            "Убедитесь, что врач внёс ваш номер телефона в карту пациента, "
            "и попробуйте ещё раз: /start",
            reply_markup={"remove_keyboard": True},
        )
        return False


async def handle_stop(chat_id: str, db: Session) -> bool:
    """Handle /stop — unlink patient."""
    patient = db.query(Patient).filter(Patient.telegram_id == str(chat_id)).first()
    if patient:
        patient.telegram_id = None
        db.commit()
        await send_message(chat_id, "🔕 Уведомления отключены. Для повторного подключения напишите /start")
        return True
    await send_message(chat_id, "Вы не были подключены.")
    return False


async def handle_status(chat_id: str, db: Session) -> bool:
    """Handle /status — show last analysis."""
    patient = db.query(Patient).filter(Patient.telegram_id == str(chat_id)).first()
    if not patient:
        await send_message(chat_id, "Вы не подключены. Напишите /start")
        return False

    last = db.query(Analysis).filter(Analysis.patient_id == patient.id).order_by(Analysis.created_at.desc()).first()
    if not last:
        await send_message(chat_id, f"Пациент: {patient.fio}\nАнализов пока нет.")
        return True

    report_link = f"{WEBAPP_URL}/report/{last.access_token}" if last.access_token else ""
    await send_message(
        chat_id,
        f"📊 <b>Последний анализ</b>\n\n"
        f"Пациент: {patient.fio}\n"
        f"Дата: {last.created_at.strftime('%d.%m.%Y') if last.created_at else '—'}\n"
        f"Налёт: <b>{last.plaque_pct_overall}%</b>\n"
        f"{'🔗 Отчёт: ' + report_link if report_link else ''}",
    )
    return True


async def send_reminder(patient: Patient, reminder_type: str, doctor_name: str = "", custom_text: str = ""):
    if not patient.telegram_id:
        return False

    if reminder_type == "controlled":
        text = (
            f"🦷 <b>Контролируемая гигиена</b>\n\n"
            f"Здравствуйте, {patient.fio}!\n\n"
            f"По результатам последнего анализа рекомендован контрольный визит.\n\n"
            f"{custom_text}\n"
            f"{'Врач: ' + doctor_name if doctor_name else ''}"
        )
    else:
        text = (
            f"🦷 <b>Плановая гигиена</b>\n\n"
            f"Здравствуйте, {patient.fio}!\n\n"
            f"Подошло время плановой профессиональной гигиены. Врач ждёт вас!\n\n"
            f"{custom_text}\n"
            f"{'Врач: ' + doctor_name if doctor_name else ''}"
        )

    return await send_message(patient.telegram_id, text)


def get_patients_for_reminder(db: Session) -> list[dict]:
    results = []
    patients = db.query(Patient).filter(Patient.telegram_id.isnot(None)).all()

    for patient in patients:
        last = db.query(Analysis).filter(Analysis.patient_id == patient.id).order_by(Analysis.created_at.desc()).first()
        if not last or not last.created_at:
            continue

        days = (datetime.utcnow() - last.created_at).days
        plaque = last.plaque_pct_overall or 0

        if plaque > 30 and 13 <= days <= 15:
            results.append({"patient": patient, "type": "controlled", "plaque": plaque, "days_since": days})
        if plaque <= 10 and 175 <= days <= 185:
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days})
        elif plaque <= 25 and 115 <= days <= 125:
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days})
        elif plaque <= 50 and 55 <= days <= 65:
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days})
        elif plaque > 50 and 25 <= days <= 35:
            results.append({"patient": patient, "type": "planned", "plaque": plaque, "days_since": days})

    return results
