"""Email service for sending notifications, reports, reminders."""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str, attachment_path: str | None = None) -> bool:
    """Send email via SMTP."""
    if not settings.smtp_email or not settings.smtp_password:
        logger.warning("SMTP not configured")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"Odonta Index AI <{settings.smtp_email}>"
        msg["To"] = to
        msg["Subject"] = subject

        msg.attach(MIMEText(html_body, "html"))

        # Attach PDF if provided
        if attachment_path and Path(attachment_path).exists():
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "pdf")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename={Path(attachment_path).name}")
                msg.attach(part)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_email, settings.smtp_password)
            server.send_message(msg)

        logger.info(f"Email sent to {to}")
        return True

    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False


def send_report_email(to: str, patient_name: str, plaque_pct: float, pdf_path: str) -> bool:
    """Send analysis report to patient via email."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0891b2; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0;">🦷 Odonta Index AI</h2>
            <p style="margin: 5px 0 0; opacity: 0.8;">Отчёт о гигиене полости рта</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Здравствуйте, {patient_name}!</p>
            <p>Результаты вашего анализа гигиены готовы.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">Общий процент налёта</p>
                <p style="font-size: 36px; font-weight: bold; color: {'#ef4444' if plaque_pct > 50 else '#f59e0b' if plaque_pct > 15 else '#10b981'}; margin: 5px 0;">{plaque_pct}%</p>
            </div>
            <p>PDF-отчёт прикреплён к этому письму.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                Результаты не являются диагнозом и не заменяют консультацию врача.<br>
                ИП Коростелев А.А. · ИНН: 312334497069 · odontaindex.ru
            </p>
        </div>
    </div>
    """
    return send_email(to, f"Отчёт о гигиене — {patient_name}", html, pdf_path)


def send_reminder_email(to: str, patient_name: str, reminder_type: str) -> bool:
    """Send hygiene reminder via email."""
    if reminder_type == "controlled":
        subject = "Контролируемая гигиена — визит рекомендован"
        text = "По результатам последнего анализа рекомендован контрольный визит к гигиенисту."
    else:
        subject = "Плановая гигиена — время визита"
        text = "Подошло время плановой профессиональной гигиены полости рта. Врач ждёт вас!"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0891b2; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0;">🦷 Напоминание</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Здравствуйте, {patient_name}!</p>
            <p>{text}</p>
            <a href="https://odontaindex.ru" style="display: inline-block; background: #0891b2; color: white; padding: 10px 25px; border-radius: 8px; text-decoration: none; margin-top: 10px;">Записаться на приём</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">odontaindex.ru</p>
        </div>
    </div>
    """
    return send_email(to, subject, html)
