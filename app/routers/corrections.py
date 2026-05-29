from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis, Patient, Doctor, Clinic, AdminUser
from app.services.index_calculator import calculate_indices
from app.services.pdf_generator import generate_pdf
from app.routers.auth import get_current_user

router = APIRouter()


class CorrectionRequest(BaseModel):
    plaque_pct_front: float | None = Field(None, ge=0, le=100)
    plaque_pct_right: float | None = Field(None, ge=0, le=100)
    plaque_pct_left: float | None = Field(None, ge=0, le=100)
    recommendations: str | None = Field(None, max_length=5000)
    doctor_comment: str | None = Field(None, max_length=5000)


@router.put("/analysis/{analysis_id}/correct")
def correct_analysis(
    analysis_id: int,
    body: CorrectionRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    changed = False

    if body.plaque_pct_front is not None:
        analysis.plaque_pct_front = body.plaque_pct_front
        changed = True
    if body.plaque_pct_right is not None:
        analysis.plaque_pct_right = body.plaque_pct_right
        changed = True
    if body.plaque_pct_left is not None:
        analysis.plaque_pct_left = body.plaque_pct_left
        changed = True
    if body.recommendations is not None:
        analysis.recommendations = body.recommendations
    if body.doctor_comment is not None:
        analysis.doctor_comment = body.doctor_comment

    # Recalculate if percentages changed
    if changed:
        analysis.plaque_pct_overall = round(
            (analysis.plaque_pct_front + analysis.plaque_pct_right + analysis.plaque_pct_left) / 3, 1
        )
        indices = calculate_indices(
            analysis.plaque_pct_front,
            analysis.plaque_pct_right,
            analysis.plaque_pct_left,
        )
        analysis.index_fedorov = indices.fedorov_volodkina
        analysis.index_api_lange = indices.api_lange
        analysis.index_ohi_s = indices.ohi_s
        analysis.index_silness_loe = indices.silness_loe
        analysis.index_php = indices.php

    # Regenerate PDF
    patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == analysis.doctor_id).first() if analysis.doctor_id else None
    clinic = db.query(Clinic).filter(Clinic.id == analysis.clinic_id).first() if analysis.clinic_id else None

    indices = calculate_indices(
        analysis.plaque_pct_front,
        analysis.plaque_pct_right,
        analysis.plaque_pct_left,
    )

    pdf_path = analysis.pdf_path or f"results/{analysis_id}_report.pdf"
    generate_pdf(analysis, patient, doctor, clinic, indices, pdf_path)
    analysis.pdf_path = pdf_path

    db.commit()

    return {
        "id": analysis.id,
        "plaque_pct_front": analysis.plaque_pct_front,
        "plaque_pct_right": analysis.plaque_pct_right,
        "plaque_pct_left": analysis.plaque_pct_left,
        "plaque_pct_overall": analysis.plaque_pct_overall,
        "index_fedorov": analysis.index_fedorov,
        "index_api_lange": analysis.index_api_lange,
        "index_ohi_s": analysis.index_ohi_s,
        "index_silness_loe": analysis.index_silness_loe,
        "index_php": analysis.index_php,
        "recommendations": analysis.recommendations,
        "doctor_comment": analysis.doctor_comment,
        "pdf_url": f"/api/report/{analysis.id}/pdf",
        "message": "Результаты обновлены, PDF пересоздан",
    }


@router.post("/analyses/regenerate-all-pdfs")
def regenerate_all_pdfs(
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate all PDF reports with current template. Admin only."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    analyses = db.query(Analysis).all()
    count = 0
    errors = []

    for analysis in analyses:
        try:
            patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
            if not patient:
                continue
            doctor = db.query(Doctor).filter(Doctor.id == analysis.doctor_id).first() if analysis.doctor_id else None
            clinic = db.query(Clinic).filter(Clinic.id == analysis.clinic_id).first() if analysis.clinic_id else None

            indices = calculate_indices(
                analysis.plaque_pct_front,
                analysis.plaque_pct_right,
                analysis.plaque_pct_left,
            )

            pdf_path = analysis.pdf_path or f"results/{analysis.id}_report.pdf"
            generate_pdf(analysis, patient, doctor, clinic, indices, pdf_path)
            analysis.pdf_path = pdf_path
            count += 1
        except Exception as e:
            errors.append(f"Analysis {analysis.id}: {str(e)}")

    db.commit()
    return {"regenerated": count, "errors": errors}
