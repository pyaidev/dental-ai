from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, Analysis, AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/patients/search")
def search_patients(
    q: str = Query("", min_length=0),
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Patient)
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
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
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


@router.delete("/analysis/{analysis_id}")
def delete_analysis(
    analysis_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    import os
    for path in [analysis.photo_front, analysis.photo_right, analysis.photo_left,
                 analysis.overlay_front, analysis.overlay_right, analysis.overlay_left,
                 analysis.pdf_path]:
        if path and os.path.exists(path):
            os.remove(path)

    db.delete(analysis)
    db.commit()
    return {"ok": True, "message": "Анализ удалён"}
