import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import InterdentalChart, PeriodontalChart, Patient, AdminUser
from app.routers.auth import get_current_user
from app.routers.subscriptions import check_permission

router = APIRouter()


# ── Interdental Chart (Yershikogramma) ──

class InterdentalRequest(BaseModel):
    patient_id: int
    data: dict  # {tooth_pair: brush_size} e.g. {"11-12": "0.4mm", "12-13": "0.5mm"}
    brand: str = "curaprox"  # curaprox, tepe, pesitro
    notes: str = Field("", max_length=1000)


@router.post("/interdental")
def save_interdental(
    body: InterdentalRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not check_permission(user.id, "interdental", db):
        raise HTTPException(status_code=403, detail="Ваш тариф не включает ёршикограмму. Перейдите на тариф «Гигиена + Ёршики» или выше.")

    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(InterdentalChart).filter(
        InterdentalChart.patient_id == body.patient_id
    ).first()

    if existing:
        existing.data = json.dumps(body.data, ensure_ascii=False)
        existing.brand = body.brand
        existing.notes = body.notes
        chart = existing
    else:
        chart = InterdentalChart(
            patient_id=body.patient_id,
            data=json.dumps(body.data, ensure_ascii=False),
            brand=body.brand,
            notes=body.notes,
        )
        db.add(chart)

    db.commit()
    db.refresh(chart)
    return {"id": chart.id, "data": json.loads(chart.data), "brand": chart.brand, "notes": chart.notes}


@router.get("/interdental/{patient_id}")
def get_interdental(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chart = db.query(InterdentalChart).filter(
        InterdentalChart.patient_id == patient_id
    ).order_by(InterdentalChart.created_at.desc()).first()

    if not chart:
        return {"exists": False}
    return {"exists": True, "id": chart.id, "data": json.loads(chart.data), "brand": chart.brand or "curaprox", "notes": chart.notes}


# ── Periodontal Chart (Parodontogramma) ──

class PeriodontalRequest(BaseModel):
    patient_id: int
    data: dict  # {tooth: {buccal: [3,3,3], lingual: [3,3,3], bleeding: false, mobility: 0, recession: 0}}
    notes: str = Field("", max_length=1000)


@router.post("/periodontal")
def save_periodontal(
    body: PeriodontalRequest,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not check_permission(user.id, "periodontal", db):
        raise HTTPException(status_code=403, detail="Ваш тариф не включает пародонтограмму. Перейдите на тариф «Гигиена + Ёршики + Пародонтограмма» или выше.")

    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(PeriodontalChart).filter(
        PeriodontalChart.patient_id == body.patient_id
    ).first()

    if existing:
        existing.data = json.dumps(body.data, ensure_ascii=False)
        existing.notes = body.notes
        chart = existing
    else:
        chart = PeriodontalChart(
            patient_id=body.patient_id,
            data=json.dumps(body.data, ensure_ascii=False),
            notes=body.notes,
        )
        db.add(chart)

    db.commit()
    db.refresh(chart)

    # Calculate summary
    chart_data = json.loads(chart.data)
    total_teeth = len(chart_data)
    deep_pockets = 0
    bleeding_count = 0
    for tooth, vals in chart_data.items():
        for pd in vals.get("buccal", []) + vals.get("lingual", []):
            if pd >= 4:
                deep_pockets += 1
        if vals.get("bleeding"):
            bleeding_count += 1

    return {
        "id": chart.id,
        "data": chart_data,
        "notes": chart.notes,
        "summary": {
            "total_teeth": total_teeth,
            "deep_pockets": deep_pockets,
            "bleeding_sites": bleeding_count,
        },
    }


@router.get("/periodontal/{patient_id}")
def get_periodontal(
    patient_id: int,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chart = db.query(PeriodontalChart).filter(
        PeriodontalChart.patient_id == patient_id
    ).order_by(PeriodontalChart.created_at.desc()).first()

    if not chart:
        return {"exists": False}

    chart_data = json.loads(chart.data)
    total_teeth = len(chart_data)
    deep_pockets = 0
    bleeding_count = 0
    for tooth, vals in chart_data.items():
        for pd in vals.get("buccal", []) + vals.get("lingual", []):
            if pd >= 4:
                deep_pockets += 1
        if vals.get("bleeding"):
            bleeding_count += 1

    return {
        "exists": True,
        "id": chart.id,
        "data": chart_data,
        "notes": chart.notes,
        "summary": {
            "total_teeth": total_teeth,
            "deep_pockets": deep_pockets,
            "bleeding_sites": bleeding_count,
        },
    }
