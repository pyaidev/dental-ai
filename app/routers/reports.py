import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, Doctor, Clinic, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/report/{analysis_id}/pdf")
async def download_pdf(analysis_id: int, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis or not analysis.pdf_path:
        raise HTTPException(status_code=404, detail="Report not found")
    # Ownership check
    if user.role != "admin":
        patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
        if not patient or patient.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    safe_path = Path(analysis.pdf_path).resolve()
    from app.config import settings
    safe_dir = Path(settings.results_dir).resolve()
    if not str(safe_path).startswith(str(safe_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(
        str(safe_path),
        media_type="application/pdf",
        filename=f"dental_report_{analysis_id}.pdf",
    )


@router.get("/report/{token}/public")
async def public_report(token: str, db: Session = Depends(get_db)):
    """Public endpoint for QR code — uses secure access token, not sequential ID."""
    analysis = db.query(Analysis).filter(Analysis.access_token == token).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Report not found")

    patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == analysis.doctor_id).first() if analysis.doctor_id else None
    clinic = db.query(Clinic).filter(Clinic.id == analysis.clinic_id).first() if analysis.clinic_id else None

    # Determine severity
    pct = analysis.plaque_pct_overall or 0
    if pct <= 10:
        severity = "Хороший"
        severity_color = "green"
    elif pct <= 25:
        severity = "Удовлетворительный"
        severity_color = "yellow"
    elif pct <= 50:
        severity = "Неудовлетворительный"
        severity_color = "orange"
    else:
        severity = "Необходима срочная забота"
        severity_color = "red"

    # Next visit
    if pct <= 10:
        next_visit = "6 месяцев"
    elif pct <= 25:
        next_visit = "4 месяца"
    elif pct <= 50:
        next_visit = "2-3 месяца"
    else:
        next_visit = "1-2 месяца"

    return {
        "id": analysis.id,
        "date": analysis.created_at.strftime("%d.%m.%Y") if analysis.created_at else "",
        "patient": {
            "fio": patient.fio if patient else "",
            "date_of_birth": patient.date_of_birth if patient else "",
            "card_number": patient.card_number if patient else "",
        },
        "doctor": {
            "fio": doctor.fio if doctor else "",
            "position": doctor.position if doctor else "",
        },
        "clinic": {
            "name": clinic.name if clinic else "",
            "address": clinic.address if clinic else "",
            "phone": clinic.phone if clinic else "",
        },
        "plaque": {
            "overall": analysis.plaque_pct_overall,
            "front": analysis.plaque_pct_front,
            "right": analysis.plaque_pct_right,
            "left": analysis.plaque_pct_left,
        },
        "severity": severity,
        "severity_color": severity_color,
        "indices": {
            "fedorov": {"value": analysis.index_fedorov, "name": "Фёдорова-Володкиной"},
            "api_lange": {"value": analysis.index_api_lange, "name": "API Lange"},
            "ohi_s": {"value": analysis.index_ohi_s, "name": "Грин-Вермиллиона"},
            "silness_loe": {"value": analysis.index_silness_loe, "name": "Silness-Löe"},
            "php": {"value": analysis.index_php, "name": "PHP"},
        },
        "has_braces": analysis.has_braces,
        "has_implants": analysis.has_implants,
        "recommendations": analysis.recommendations,
        "next_visit": next_visit,
        "overlay_front": analysis.overlay_front,
        "overlay_right": analysis.overlay_right,
        "overlay_left": analysis.overlay_left,
        "pdf_url": f"/api/report/{analysis.id}/pdf" if analysis.pdf_path else None,
    }
