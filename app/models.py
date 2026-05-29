from datetime import datetime

from sqlalchemy import Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    fio: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="admin")
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PatientQuestionnaire(Base):
    __tablename__ = "questionnaires"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    # General
    smoking: Mapped[bool] = mapped_column(Boolean, default=False)
    diabetes: Mapped[bool] = mapped_column(Boolean, default=False)
    pregnancy: Mapped[bool] = mapped_column(Boolean, default=False)
    dry_mouth: Mapped[bool] = mapped_column(Boolean, default=False)
    bruxism: Mapped[bool] = mapped_column(Boolean, default=False)
    # Hygiene
    brushing_frequency: Mapped[str | None] = mapped_column(String(50))  # 1x, 2x, 3x, rarely
    uses_interdental: Mapped[bool] = mapped_column(Boolean, default=False)
    bleeding_gums: Mapped[bool] = mapped_column(Boolean, default=False)
    sensitivity: Mapped[bool] = mapped_column(Boolean, default=False)
    # Aesthetics
    wants_whitening: Mapped[bool] = mapped_column(Boolean, default=False)
    satisfied_color: Mapped[bool] = mapped_column(Boolean, default=True)
    bad_breath: Mapped[bool] = mapped_column(Boolean, default=False)
    # Oral status
    crowns_veneers: Mapped[bool] = mapped_column(Boolean, default=False)
    crowding: Mapped[bool] = mapped_column(Boolean, default=False)
    white_spots: Mapped[bool] = mapped_column(Boolean, default=False)
    food_impaction: Mapped[bool] = mapped_column(Boolean, default=False)
    pigmentation: Mapped[bool] = mapped_column(Boolean, default=False)
    # Extended hygiene
    uses_irrigator: Mapped[bool] = mapped_column(Boolean, default=False)
    cleans_tongue: Mapped[bool] = mapped_column(Boolean, default=False)
    electric_brush: Mapped[bool] = mapped_column(Boolean, default=False)
    # Habits
    coffee_tea: Mapped[bool] = mapped_column(Boolean, default=False)
    sweets: Mapped[bool] = mapped_column(Boolean, default=False)
    acidic_drinks: Mapped[bool] = mapped_column(Boolean, default=False)
    # Medical
    casein_allergy: Mapped[bool] = mapped_column(Boolean, default=False)
    gum_disease: Mapped[bool] = mapped_column(Boolean, default=False)
    # Preferences
    prefers_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    prefers_budget: Mapped[bool] = mapped_column(Boolean, default=False)
    # Extra
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="questionnaires")


class WhiteningCase(Base):
    __tablename__ = "whitening_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    tooth_type: Mapped[str] = mapped_column(String(50))  # tetracycline, fluorosis, healthy, after_braces
    photo_before: Mapped[str | None] = mapped_column(String(500))
    photo_after: Mapped[str | None] = mapped_column(String(500))
    recommendations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship()


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id"), nullable=False)
    plan: Mapped[str] = mapped_column(String(50))  # hygiene, hygiene_brushes, hygiene_perio, all
    reports_total: Mapped[int] = mapped_column(Integer, default=0)
    reports_used: Mapped[int] = mapped_column(Integer, default=0)
    price_per_report: Mapped[float] = mapped_column(Float)  # 35, 40, 50, 60
    payment_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, expired, pending
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped["AdminUser"] = relationship()

    @property
    def reports_remaining(self) -> int:
        return max(self.reports_total - self.reports_used, 0)


class InterdentalChart(Base):
    __tablename__ = "interdental_charts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    data: Mapped[str] = mapped_column(Text)  # JSON: {tooth_pair: brush_size}
    brand: Mapped[str | None] = mapped_column(String(50), default="curaprox")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship()


class PeriodontalChart(Base):
    __tablename__ = "periodontal_charts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    data: Mapped[str] = mapped_column(Text)  # JSON: {tooth: {buccal: [pd1,pd2,pd3], lingual: [pd1,pd2,pd3], bleeding: bool, mobility: int}}
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship()


class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(50))
    logo_path: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doctors: Mapped[list["Doctor"]] = relationship(back_populates="clinic")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="clinic")


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fio: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str | None] = mapped_column(String(255))
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"))

    clinic: Mapped[Clinic | None] = relationship(back_populates="doctors")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fio: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str | None] = mapped_column(String(20))
    card_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    telegram_id: Mapped[str | None] = mapped_column(String(50))
    max_id: Mapped[str | None] = mapped_column(String(50))
    phone: Mapped[str | None] = mapped_column(String(50))
    checkin_token: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="patient")
    questionnaires: Mapped[list["PatientQuestionnaire"]] = relationship(back_populates="patient")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"))
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinics.id"))

    has_braces: Mapped[bool] = mapped_column(Boolean, default=False)
    has_implants: Mapped[bool] = mapped_column(Boolean, default=False)

    photo_front: Mapped[str | None] = mapped_column(String(500))
    photo_right: Mapped[str | None] = mapped_column(String(500))
    photo_left: Mapped[str | None] = mapped_column(String(500))
    overlay_front: Mapped[str | None] = mapped_column(String(500))
    overlay_right: Mapped[str | None] = mapped_column(String(500))
    overlay_left: Mapped[str | None] = mapped_column(String(500))

    plaque_pct_front: Mapped[float | None] = mapped_column(Float)
    plaque_pct_right: Mapped[float | None] = mapped_column(Float)
    plaque_pct_left: Mapped[float | None] = mapped_column(Float)
    plaque_pct_overall: Mapped[float | None] = mapped_column(Float)

    index_fedorov: Mapped[float | None] = mapped_column(Float)
    index_api_lange: Mapped[float | None] = mapped_column(Float)
    index_ohi_s: Mapped[float | None] = mapped_column(Float)
    index_silness_loe: Mapped[float | None] = mapped_column(Float)
    index_php: Mapped[float | None] = mapped_column(Float)

    zone_data: Mapped[str | None] = mapped_column(Text)
    recommendations: Mapped[str | None] = mapped_column(Text)
    doctor_comment: Mapped[str | None] = mapped_column(Text)

    pdf_path: Mapped[str | None] = mapped_column(String(500))
    access_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped[Patient] = relationship(back_populates="analyses")
    doctor: Mapped[Doctor | None] = relationship(back_populates="analyses")
    clinic: Mapped[Clinic | None] = relationship(back_populates="analyses")
