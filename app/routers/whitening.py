import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import WhiteningCase, Patient, AdminUser
from app.routers.auth import get_current_user
from app.routers.analysis import validate_upload
from app.routers.subscriptions import check_permission
from app.services.recommendations import generate_whitening_recommendations

router = APIRouter()


@router.post("/whitening")
async def create_whitening(
    patient_id: int = Form(...),
    tooth_type: str = Form(...),  # tetracycline, fluorosis, healthy, after_braces
    photo_before: UploadFile = File(...),
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not check_permission(user.id, "whitening", db):
        raise HTTPException(status_code=403, detail="Ваш тариф не включает отбеливание. Перейдите на «Полный пакет».")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if tooth_type not in ("tetracycline", "fluorosis", "healthy", "after_braces"):
        raise HTTPException(status_code=400, detail="Invalid tooth type")

    content = await validate_upload(photo_before)
    case_id = str(uuid.uuid4())[:8]
    ext = Path(photo_before.filename).suffix.lower() if photo_before.filename else ".jpg"
    photo_path = str(Path(settings.upload_dir) / f"{case_id}_whitening_before{ext}")
    Path(photo_path).write_bytes(content)

    recs = await generate_whitening_recommendations(tooth_type, patient.fio)

    case = WhiteningCase(
        patient_id=patient_id,
        tooth_type=tooth_type,
        photo_before=photo_path,
        recommendations=recs,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return {
        "id": case.id,
        "tooth_type": case.tooth_type,
        "photo_before": case.photo_before,
        "recommendations": case.recommendations,
    }


@router.get("/whitening/{patient_id}")
def get_whitening(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cases = db.query(WhiteningCase).filter(
        WhiteningCase.patient_id == patient_id
    ).order_by(WhiteningCase.created_at.desc()).all()

    return [{
        "id": c.id,
        "tooth_type": c.tooth_type,
        "photo_before": c.photo_before,
        "photo_after": c.photo_after,
        "recommendations": c.recommendations,
        "date": c.created_at.strftime("%Y-%m-%d") if c.created_at else "",
    } for c in cases]
