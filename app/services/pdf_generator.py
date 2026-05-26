import base64
import io
from datetime import datetime, timedelta
from pathlib import Path

import qrcode
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.models import Analysis, Patient, Doctor, Clinic
from app.services.index_calculator import DentalIndices


def generate_qr_base64(url: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


def calc_visit_schedule(plaque_pct: float, analysis_date: datetime) -> list[dict]:
    """Calculate recommended visit dates for next 2 years."""
    if plaque_pct <= 10:
        interval_months = 6
    elif plaque_pct <= 25:
        interval_months = 4
    elif plaque_pct <= 50:
        interval_months = 3
    else:
        interval_months = 2

    schedule = []
    current = analysis_date
    for i in range(1, 5):  # Next 4 visits
        next_date = current + timedelta(days=interval_months * 30 * i)
        schedule.append({
            "date": next_date.strftime("%d.%m.%Y"),
            "month_name": next_date.strftime("%B %Y"),
            "number": i,
        })
    return schedule


def generate_pdf(
    analysis: Analysis,
    patient: Patient,
    doctor: Doctor | None,
    clinic: Clinic | None,
    indices: DentalIndices,
    output_path: str,
    history: list[dict] | None = None,
    base_url: str = "http://localhost:3000",
):
    env = Environment(loader=FileSystemLoader("templates/report"))
    template = env.get_template("report.html")

    def img_to_base64(path: str | None) -> str:
        if not path or not Path(path).exists():
            return ""
        data = Path(path).read_bytes()
        ext = Path(path).suffix.lower().lstrip(".")
        if ext in ("jpg", "jpeg"):
            mime = "image/jpeg"
        elif ext == "png":
            mime = "image/png"
        else:
            mime = "image/jpeg"
        return f"data:{mime};base64,{base64.b64encode(data).decode()}"

    pct = analysis.plaque_pct_overall or 0

    # Next visit interval
    if pct <= 10:
        next_visit_months = 6
    elif pct <= 25:
        next_visit_months = 4
    elif pct <= 50:
        next_visit_months = 2
    else:
        next_visit_months = 1

    # Severity
    if pct <= 10:
        severity = "Хороший уровень гигиены"
        severity_color = "#4CAF50"
    elif pct <= 25:
        severity = "Удовлетворительный"
        severity_color = "#FFC107"
    elif pct <= 50:
        severity = "Неудовлетворительный"
        severity_color = "#FF9800"
    else:
        severity = "Необходима срочная забота"
        severity_color = "#F44336"

    # QR code to online report
    report_url = f"{base_url}/report/{analysis.id}"
    qr_b64 = generate_qr_base64(report_url)

    # Visit schedule
    analysis_date = analysis.created_at or datetime.now()
    schedule = calc_visit_schedule(pct, analysis_date)

    context = {
        "patient": patient,
        "doctor": doctor,
        "clinic": clinic,
        "analysis": analysis,
        "indices": indices,
        "date": analysis_date.strftime("%Y-%m-%d"),
        "photo_front_b64": img_to_base64(analysis.photo_front),
        "photo_right_b64": img_to_base64(analysis.photo_right),
        "photo_left_b64": img_to_base64(analysis.photo_left),
        "overlay_front_b64": img_to_base64(analysis.overlay_front),
        "overlay_right_b64": img_to_base64(analysis.overlay_right),
        "overlay_left_b64": img_to_base64(analysis.overlay_left),
        "logo_b64": img_to_base64(clinic.logo_path if clinic else None),
        "severity": severity,
        "severity_color": severity_color,
        "next_visit_months": next_visit_months,
        "recommendations": analysis.recommendations or "",
        "qr_b64": qr_b64,
        "report_url": report_url,
        "schedule": schedule,
        "history": history or [],
    }

    html_content = template.render(**context)
    css_path = Path("templates/report/report.css")
    HTML(string=html_content).write_pdf(
        output_path,
        stylesheets=[str(css_path)] if css_path.exists() else [],
    )
