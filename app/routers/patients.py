from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, Analysis, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


def _patient_filter(db, user):
    """Return Patient query filtered by user. Admin sees all."""
    q = db.query(Patient)
    if user.role != "admin":
        q = q.filter(Patient.user_id == user.id)
    return q


@router.get("/patients/search")
def search_patients(
    q: str = Query("", min_length=0),
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _patient_filter(db, user)
    if q:
        query = query.filter(
            or_(
                Patient.fio.ilike(f"%{q}%"),
                Patient.card_number.ilike(f"%{q}%"),
            )
        )
    patients = query.order_by(Patient.created_at.desc()).limit(50).all()

    result = []
    for p in patients:
        last_analysis = (
            db.query(Analysis)
            .filter(Analysis.patient_id == p.id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        result.append({
            "id": p.id,
            "fio": p.fio,
            "card_number": p.card_number,
            "date_of_birth": p.date_of_birth,
            "total_analyses": db.query(Analysis).filter(Analysis.patient_id == p.id).count(),
            "last_plaque_pct": last_analysis.plaque_pct_overall if last_analysis else None,
            "last_visit": last_analysis.created_at.isoformat() if last_analysis and last_analysis.created_at else None,
        })
    return result


@router.get("/patients/{patient_id}/history")
def patient_history(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _patient_filter(db, user).filter(Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    analyses = (
        db.query(Analysis)
        .filter(Analysis.patient_id == patient_id)
        .order_by(Analysis.created_at.asc())
        .all()
    )

    history = []
    for a in analyses:
        history.append({
            "id": a.id,
            "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            "plaque_pct_overall": a.plaque_pct_overall,
            "plaque_pct_front": a.plaque_pct_front,
            "plaque_pct_right": a.plaque_pct_right,
            "plaque_pct_left": a.plaque_pct_left,
            "index_fedorov": a.index_fedorov,
            "index_api_lange": a.index_api_lange,
            "index_ohi_s": a.index_ohi_s,
            "index_silness_loe": a.index_silness_loe,
            "index_php": a.index_php,
            "pdf_url": f"/api/report/{a.id}/pdf" if a.pdf_path else None,
        })

    return {
        "patient": {
            "id": patient.id,
            "fio": patient.fio,
            "card_number": patient.card_number,
            "date_of_birth": patient.date_of_birth,
        },
        "history": history,
    }


@router.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _patient_filter(db, user).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    import os
    analyses = db.query(Analysis).filter(Analysis.patient_id == patient_id).all()
    for a in analyses:
        for path in [a.photo_front, a.photo_right, a.photo_left,
                     a.overlay_front, a.overlay_right, a.overlay_left, a.pdf_path]:
            if path and os.path.exists(path):
                os.remove(path)
        db.delete(a)

    db.delete(patient)
    db.commit()
    return {"ok": True, "message": "Пациент и все анализы удалены"}


@router.delete("/analysis/{analysis_id}")
def delete_analysis(
    analysis_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Check ownership
    if user.role != "admin":
        patient = db.query(Patient).filter(Patient.id == analysis.patient_id).first()
        if not patient or patient.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    import os
    for path in [analysis.photo_front, analysis.photo_right, analysis.photo_left,
                 analysis.overlay_front, analysis.overlay_right, analysis.overlay_left,
                 analysis.pdf_path]:
        if path and os.path.exists(path):
            os.remove(path)

    db.delete(analysis)
    db.commit()
    return {"ok": True, "message": "Анализ удалён"}
