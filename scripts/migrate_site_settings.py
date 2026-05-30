"""
Migration: create site_settings table and insert default row.
Run once on production: python scripts/migrate_site_settings.py
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal
from app.models import Base, SiteSettings

DEFAULT_HERO = {
    "badge": "Используют 50+ стоматологий",
    "title": "AI-анализ гигиены",
    "title_gradient": "полости рта",
    "subtitle": "Загрузите фото зубов — нейросеть определит налёт, рассчитает индексы и подберёт средства гигиены за 30 секунд",
    "cta_primary": "Попробовать бесплатно",
    "cta_secondary": "Как это работает",
}

DEFAULT_FEATURES = [
    {"title": "AI-анализ налёта", "desc": "Нейросеть YOLOv8 определяет зоны налёта по фото с индикатором"},
    {"title": "5 индексов гигиены", "desc": "Фёдорова-Володкиной, API Lange, OHI-S, Silness-Löe, PHP"},
    {"title": "PDF-отчёты", "desc": "Профессиональные отчёты с QR-кодом для пациента"},
    {"title": "Telegram + Max", "desc": "Автоматические напоминания пациентам о визитах"},
    {"title": "Ёршикограмма", "desc": "Интерактивная карта межзубных промежутков"},
    {"title": "Пародонтограмма", "desc": "Глубина карманов, кровоточивость, подвижность"},
]

DEFAULT_STEPS = [
    {"num": "01", "title": "Загрузите фото", "desc": "3 фотографии зубов с индикатором налёта"},
    {"num": "02", "title": "AI анализирует", "desc": "Нейросеть определяет налёт и рассчитывает индексы"},
    {"num": "03", "title": "Получите отчёт", "desc": "PDF с рекомендациями по средствам гигиены"},
    {"num": "04", "title": "Отправьте пациенту", "desc": "Через Telegram, Max или email — в один клик"},
]

DEFAULT_STATS = [
    {"value": 5, "suffix": "", "label": "индексов гигиены"},
    {"value": 30, "suffix": " сек", "label": "на анализ"},
    {"value": 95, "suffix": "%", "label": "точность AI"},
]

DEFAULT_CTA = {
    "title": "Начните анализировать",
    "title_line2": "уже сегодня",
    "subtitle": "Регистрация бесплатна. Первые 5 отчётов — в подарок.",
    "button": "Создать аккаунт",
}

DEFAULT_FOOTER = {
    "company": "ИП Коростелев Александр Андреевич",
    "inn": "312334497069",
    "ogrnip": "323508100020560",
    "address": "140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2",
    "copyright": "© 2026 Odonta Index AI",
}


def run():
    print("Creating site_settings table if not exists...")
    Base.metadata.create_all(bind=engine, tables=[SiteSettings.__table__])
    print("Table created (or already exists).")

    db = SessionLocal()
    try:
        existing = db.query(SiteSettings).first()
        if existing:
            print("Default row already exists, skipping insert.")
        else:
            row = SiteSettings(
                hero=json.dumps(DEFAULT_HERO, ensure_ascii=False),
                features=json.dumps(DEFAULT_FEATURES, ensure_ascii=False),
                steps=json.dumps(DEFAULT_STEPS, ensure_ascii=False),
                stats=json.dumps(DEFAULT_STATS, ensure_ascii=False),
                cta=json.dumps(DEFAULT_CTA, ensure_ascii=False),
                footer=json.dumps(DEFAULT_FOOTER, ensure_ascii=False),
            )
            db.add(row)
            db.commit()
            print("Default site_settings row inserted.")
    finally:
        db.close()

    print("Migration complete.")


if __name__ == "__main__":
    run()
