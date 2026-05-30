import json
import secrets
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Patient, Doctor, Clinic, Analysis, AdminUser
from app.services.plaque_detector import detect_plaque
from app.services.index_calculator import calculate_indices
from app.services.recommendations import generate_recommendations
from app.services.pdf_generator import generate_pdf
from app.routers.auth import get_current_user

ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


async def validate_upload(file: UploadFile) -> bytes:
    """Validate uploaded file: check type, size, and content."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail=f"Недопустимый формат: {ext}. Разрешены: jpg, png, webp")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 15 МБ)")
    try:
        img = Image.open(BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Повреждённый файл изображения")
    return content

router = APIRouter()


@router.post("/analyze")
async def analyze(
    patient_fio: str = Form(...),
    patient_dob: str = Form(""),
    patient_phone: str = Form(""),
    card_number: str = Form(...),
    doctor_fio: str = Form(""),
    doctor_position: str = Form(""),
    clinic_name: str = Form(""),
    clinic_address: str = Form(""),
    clinic_phone: str = Form(""),
    has_braces: bool = Form(False),
    has_implants: bool = Form(False),
    doctor_comment: str = Form(""),
    photo_front: UploadFile = File(...),
    photo_right: UploadFile = File(...),
    photo_left: UploadFile = File(...),
    clinic_logo: UploadFile | None = File(None),
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check AND deduct subscription atomically BEFORE processing
    if user.role != "admin":
        from app.models import Subscription
        from sqlalchemy import update
        result = db.execute(
            update(Subscription)
            .where(Subscription.user_id == user.id, Subscription.status == "active", Subscription.reports_used < Subscription.reports_total)
            .values(reports_used=Subscription.reports_used + 1)
            .returning(Subscription.id)
        )
        if not result.fetchone():
            raise HTTPException(status_code=402, detail="Лимит отчётов исчерпан. Перейдите на подходящий тариф.")
        db.commit()

    analysis_id = str(uuid.uuid4())[:8]

    # Validate and save uploaded photos
    photo_paths = {}
    for name, file in [("front", photo_front), ("right", photo_right), ("left", photo_left)]:
        content = await validate_upload(file)
        ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
        save_path = Path(settings.upload_dir) / f"{analysis_id}_{name}{ext}"
        save_path.write_bytes(content)
        photo_paths[name] = str(save_path)

    # Save clinic logo if provided
    logo_path = None
    if clinic_logo and clinic_logo.filename:
        logo_content = await validate_upload(clinic_logo)
        ext = Path(clinic_logo.filename).suffix.lower() if clinic_logo.filename else ".png"
        logo_save = Path(settings.upload_dir) / f"{analysis_id}_logo{ext}"
        logo_save.write_bytes(logo_content)
        logo_path = str(logo_save)

    # Run plaque detection on each photo
    results = {}
    # Auto-detect braces/implants from front photo
    from app.services.braces_detector import detect_braces_implants
    auto_detect = detect_braces_implants(photo_paths["front"])
    if auto_detect["has_braces"] and not has_braces:
        has_braces = True
    if auto_detect["has_implants"] and not has_implants:
        has_implants = True

    zone_data_all = {}
    for name, path in photo_paths.items():
        overlay_path = str(Path(settings.results_dir) / f"{analysis_id}_{name}_overlay.jpg")
        result = detect_plaque(path, overlay_path)
        results[name] = result
        zone_data_all[name] = result.zone_data

    pct_front = results["front"].plaque_percent
    pct_right = results["right"].plaque_percent
    pct_left = results["left"].plaque_percent
    pct_overall = round((pct_front + pct_right + pct_left) / 3, 1)

    # Calculate dental indices
    indices = calculate_indices(pct_front, pct_right, pct_left, results["front"].zone_data)

    # Generate recommendations
    indices_dict = {
        "fedorov_volodkina": indices.fedorov_volodkina,
        "api_lange": indices.api_lange,
        "ohi_s": indices.ohi_s,
        "silness_loe": indices.silness_loe,
        "php": indices.php,
    }
    # Get questionnaire if exists
    from app.models import PatientQuestionnaire
    q_data = None
    patient_check = db.query(Patient).filter(Patient.card_number == card_number).first()
    if patient_check:
        q = db.query(PatientQuestionnaire).filter(PatientQuestionnaire.patient_id == patient_check.id).first()
        if q:
            q_data = {
                "smoking": q.smoking, "diabetes": q.diabetes, "pregnancy": q.pregnancy,
                "dry_mouth": q.dry_mouth, "bruxism": q.bruxism, "brushing_frequency": q.brushing_frequency,
                "uses_interdental": q.uses_interdental, "bleeding_gums": q.bleeding_gums,
                "sensitivity": q.sensitivity, "wants_whitening": q.wants_whitening,
                "satisfied_color": q.satisfied_color, "bad_breath": q.bad_breath,
            }

    recs = await generate_recommendations(
        pct_overall, zone_data_all.get("front", {}), has_braces, has_implants, indices_dict, q_data
    )

    # Get or create clinic
    clinic = None
    if clinic_name:
        clinic = db.query(Clinic).filter(Clinic.name == clinic_name).first()
        if not clinic:
            clinic = Clinic(name=clinic_name, address=clinic_address, phone=clinic_phone, logo_path=logo_path)
            db.add(clinic)
            db.flush()
        elif logo_path:
            clinic.logo_path = logo_path

    # Get or create doctor
    doctor = None
    if doctor_fio:
        doctor = db.query(Doctor).filter(
            Doctor.fio == doctor_fio,
            Doctor.clinic_id == (clinic.id if clinic else None),
        ).first()
        if not doctor:
            doctor = Doctor(fio=doctor_fio, position=doctor_position, clinic_id=clinic.id if clinic else None)
            db.add(doctor)
            db.flush()

    # Get or create patient
    patient = db.query(Patient).filter(Patient.card_number == card_number, Patient.user_id == user.id).first()
    if not patient:
        patient = Patient(fio=patient_fio, date_of_birth=patient_dob, card_number=card_number, phone=patient_phone if patient_phone else None, user_id=user.id)
        db.add(patient)
        db.flush()
    else:
        if patient_phone:
            patient.phone = patient_phone

    # Create analysis record
    analysis = Analysis(
        patient_id=patient.id,
        doctor_id=doctor.id if doctor else None,
        clinic_id=clinic.id if clinic else None,
        has_braces=has_braces,
        has_implants=has_implants,
        photo_front=photo_paths["front"],
        photo_right=photo_paths["right"],
        photo_left=photo_paths["left"],
        overlay_front=results["front"].overlay_path,
        overlay_right=results["right"].overlay_path,
        overlay_left=results["left"].overlay_path,
        plaque_pct_front=pct_front,
        plaque_pct_right=pct_right,
        plaque_pct_left=pct_left,
        plaque_pct_overall=pct_overall,
        index_fedorov=indices.fedorov_volodkina,
        index_api_lange=indices.api_lange,
        index_ohi_s=indices.ohi_s,
        index_silness_loe=indices.silness_loe,
        index_php=indices.php,
        zone_data=json.dumps(zone_data_all, ensure_ascii=False),
        recommendations=recs,
        doctor_comment=doctor_comment,
        access_token=secrets.token_urlsafe(32),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Subscription already deducted atomically at the top

    # Fetch chart data for PDF
    from app.models import InterdentalChart, PeriodontalChart
    import json as _json
    interdental_chart = db.query(InterdentalChart).filter(InterdentalChart.patient_id == patient.id).order_by(InterdentalChart.created_at.desc()).first()
    periodontal_chart = db.query(PeriodontalChart).filter(PeriodontalChart.patient_id == patient.id).order_by(PeriodontalChart.created_at.desc()).first()

    # Generate PDF
    pdf_path = str(Path(settings.results_dir) / f"{analysis_id}_report.pdf")
    generate_pdf(
        analysis, patient, doctor, clinic, indices, pdf_path,
        interdental_data=_json.loads(interdental_chart.data) if interdental_chart else None,
        interdental_brand=interdental_chart.brand if interdental_chart else None,
        periodontal_data=_json.loads(periodontal_chart.data) if periodontal_chart else None,
    )
    analysis.pdf_path = pdf_path
    db.commit()

    return {
        "id": analysis.id,
        "patient_id": patient.id,
        "plaque_pct_front": pct_front,
        "plaque_pct_right": pct_right,
        "plaque_pct_left": pct_left,
        "plaque_pct_overall": pct_overall,
        "index_fedorov": indices.fedorov_volodkina,
        "index_fedorov_text": indices.fedorov_interpretation,
        "index_api_lange": indices.api_lange,
        "index_api_text": indices.api_interpretation,
        "index_ohi_s": indices.ohi_s,
        "index_ohi_s_text": indices.ohi_s_interpretation,
        "index_silness_loe": indices.silness_loe,
        "index_silness_loe_text": indices.silness_loe_interpretation,
        "index_php": indices.php,
        "index_php_text": indices.php_interpretation,
        "recommendations": recs,
        "overlay_front": results["front"].overlay_path,
        "overlay_right": results["right"].overlay_path,
        "overlay_left": results["left"].overlay_path,
        "pdf_url": f"/api/report/{analysis.id}/pdf",
        "access_token": analysis.access_token,
        "public_url": f"/report/{analysis.access_token}",
        "auto_detect": auto_detect,
    }


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: int, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    # Check ownership
    patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
    if user.role != "admin" and patient and patient.user_id != user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    from app.services.index_calculator import interpret_fedorov, interpret_api, interpret_ohi_s, interpret_silness_loe, interpret_php
    return {
        "id": analysis.id,
        "patient_id": analysis.patient_id,
        "patient_fio": patient.fio if patient else "",
        "card_number": patient.card_number if patient else "",
        "plaque_pct_front": analysis.plaque_pct_front,
        "plaque_pct_right": analysis.plaque_pct_right,
        "plaque_pct_left": analysis.plaque_pct_left,
        "plaque_pct_overall": analysis.plaque_pct_overall,
        "index_fedorov": analysis.index_fedorov,
        "index_fedorov_text": interpret_fedorov(analysis.index_fedorov) if analysis.index_fedorov else "",
        "index_api_lange": analysis.index_api_lange,
        "index_api_text": interpret_api(analysis.index_api_lange) if analysis.index_api_lange else "",
        "index_ohi_s": analysis.index_ohi_s,
        "index_ohi_s_text": interpret_ohi_s(analysis.index_ohi_s) if analysis.index_ohi_s else "",
        "index_silness_loe": analysis.index_silness_loe,
        "index_silness_loe_text": interpret_silness_loe(analysis.index_silness_loe) if analysis.index_silness_loe else "",
        "index_php": analysis.index_php,
        "index_php_text": interpret_php(analysis.index_php) if analysis.index_php else "",
        "recommendations": analysis.recommendations,
        "overlay_front": analysis.overlay_front,
        "overlay_right": analysis.overlay_right,
        "overlay_left": analysis.overlay_left,
        "pdf_url": f"/api/report/{analysis.id}/pdf" if analysis.pdf_path else None,
        "access_token": analysis.access_token or "",
        "public_url": f"/report/{analysis.access_token}" if analysis.access_token else "",
    }


@router.get("/analysis/{analysis_id}/images/{position}")
async def get_overlay_image(analysis_id: int, position: str, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    overlay_map = {
        "front": analysis.overlay_front,
        "right": analysis.overlay_right,
        "left": analysis.overlay_left,
    }
    path = overlay_map.get(position)
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    safe_path = Path(path).resolve()
    safe_dir = Path(settings.results_dir).resolve()
    if not str(safe_path).startswith(str(safe_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(safe_path), media_type="image/jpeg")
