from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, AdminUser
from app.routers.auth import get_current_user
from app.services.telegram_bot import send_reminder, get_patients_for_reminder

router = APIRouter()


class ManualReminderRequest(BaseModel):
    patient_id: int
    reminder_type: str = Field("planned", pattern="^(controlled|planned)$")
    custom_text: str = Field("", max_length=500)
    doctor_name: str = Field("", max_length=255)


@router.post("/reminder/send")
async def send_manual_reminder(
    body: ManualReminderRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not patient.telegram_id:
        raise HTTPException(status_code=400, detail="У пациента не указан Telegram ID")

    ok = await send_reminder(patient, body.reminder_type, body.doctor_name, body.custom_text)
    return {"sent": ok, "message": "Напоминание отправлено" if ok else "Ошибка отправки"}


@router.get("/reminders/pending")
def pending_reminders(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = get_patients_for_reminder(db)
    return [{
        "patient_id": r["patient"].id,
        "patient_fio": r["patient"].fio,
        "type": r["type"],
        "plaque_pct": r["plaque"],
        "days_since": r["days_since"],
        "has_telegram": bool(r["patient"].telegram_id),
    } for r in items]
