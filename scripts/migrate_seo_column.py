"""
Migration: add `seo` column to site_settings table.
Run once on production:
    python scripts/migrate_seo_column.py
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, SessionLocal

DEFAULT_SEO = {
    "meta_title": "Odonta Index AI — AI-анализ гигиены полости рта для стоматологов",
    "meta_description": (
        "Сервис AI-анализа зубного налёта по фотографиям. Автоматический расчёт индексов гигиены "
        "(Фёдорова-Володкиной, OHI-S, API, Silness-Löe, PHP), PDF-отчёты, рекомендации по "
        "средствам гигиены. Для стоматологов и гигиенистов."
    ),
    "meta_keywords": (
        "анализ зубного налёта,индексы гигиены полости рта,AI стоматология,Odonta Index,"
        "Фёдорова-Володкиной,OHI-S,стоматологический отчёт,гигиенист стоматологический,"
        "анализ налёта по фото,индекс гигиены онлайн,пародонтограмма онлайн,ёршикограмма,"
        "PDF отчёт стоматолог,AI dental plaque analysis,dental hygiene index calculator"
    ),
    "og_title": "Odonta Index AI — AI-анализ гигиены полости рта",
    "og_description": (
        "Загрузите 3 фото зубов с индикатором налёта — нейросеть рассчитает индексы гигиены "
        "и сформирует PDF-отчёт с рекомендациями за 30 секунд."
    ),
    "og_image": "/og-image.png",
    "yandex_verification": "yandex-verification-code",
    "google_verification": "",
}


def run():
    print("Adding `seo` column to site_settings (IF NOT EXISTS)...")
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo TEXT DEFAULT '{}'"
        ))
        conn.commit()
    print("Column added (or already exists).")

    # Fill in default SEO data for existing row that still has empty seo
    db = SessionLocal()
    try:
        from app.models import SiteSettings
        row = db.query(SiteSettings).first()
        if row:
            current = json.loads(row.seo or "{}")
            if not current:
                row.seo = json.dumps(DEFAULT_SEO, ensure_ascii=False)
                db.commit()
                print("Default SEO data written to existing site_settings row.")
            else:
                print("SEO data already present, skipping update.")
        else:
            print("No site_settings row found. Run migrate_site_settings.py first.")
    finally:
        db.close()

    print("Migration complete.")


if __name__ == "__main__":
    run()
