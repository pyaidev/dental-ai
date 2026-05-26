from datetime import datetime

from sqlalchemy import Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    fio: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="admin")
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="patient")


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped[Patient] = relationship(back_populates="analyses")
    doctor: Mapped[Doctor | None] = relationship(back_populates="analyses")
    clinic: Mapped[Clinic | None] = relationship(back_populates="analyses")
