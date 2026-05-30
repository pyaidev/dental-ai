from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db, SessionLocal
from app.models import AdminUser
from app.routers import analysis, reports, auth, dashboard, patients, corrections, statistics, questionnaire, whitening, subscriptions, charts, reminders, detect_preview, gamification, self_checkin, async_analysis, admin_dashboard, notifications
from app.routers.auth import hash_password

app = FastAPI(title="Odonta Index AI", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://odontaindex.ru",
        "https://dashboard.odontaindex.ru",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    return response


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/results", StaticFiles(directory="results"), name="results")

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(patients.router, prefix="/api", tags=["patients"])
app.include_router(corrections.router, prefix="/api", tags=["corrections"])
app.include_router(statistics.router, prefix="/api", tags=["statistics"])
app.include_router(questionnaire.router, prefix="/api", tags=["questionnaire"])
app.include_router(whitening.router, prefix="/api", tags=["whitening"])
app.include_router(subscriptions.router, prefix="/api", tags=["subscriptions"])
app.include_router(charts.router, prefix="/api", tags=["charts"])
app.include_router(reminders.router, prefix="/api", tags=["reminders"])
app.include_router(detect_preview.router, prefix="/api", tags=["detect"])
app.include_router(gamification.router, prefix="/api", tags=["gamification"])
app.include_router(self_checkin.router, prefix="/api", tags=["checkin"])
app.include_router(async_analysis.router, prefix="/api", tags=["async"])
app.include_router(admin_dashboard.router, prefix="/api", tags=["admin"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])


@app.on_event("startup")
def on_startup():
    init_db()
    _migrate_add_order_columns()
    _create_default_admin()


def _migrate_add_order_columns():
    """Add order column to reviews and ambassadors if not present (idempotent)."""
    from sqlalchemy import text
    from app.database import engine
    try:
        with engine.connect() as conn:
            # PostgreSQL: use IF NOT EXISTS; SQLite: ignore error
            try:
                conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS \"order\" INTEGER DEFAULT 0"))
                conn.commit()
            except Exception:
                conn.rollback()
                try:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN \"order\" INTEGER DEFAULT 0"))
                    conn.commit()
                except Exception:
                    conn.rollback()
            try:
                conn.execute(text("ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS \"order\" INTEGER DEFAULT 0"))
                conn.commit()
            except Exception:
                conn.rollback()
                try:
                    conn.execute(text("ALTER TABLE ambassadors ADD COLUMN \"order\" INTEGER DEFAULT 0"))
                    conn.commit()
                except Exception:
                    conn.rollback()
    except Exception:
        pass  # Don't break startup


def _create_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == "admin").first()
        if not existing:
            admin = AdminUser(
                username="admin",
                password_hash=hash_password("admin123"),
                fio="Администратор",
                role="admin",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
