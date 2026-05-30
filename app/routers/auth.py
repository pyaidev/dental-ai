import logging
import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import bcrypt
from jose import jwt, JWTError

from app.database import get_db
from app.models import AdminUser
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

JWT_SECRET = settings.secret_key
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 480  # 8 hours


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=200)
    fio: str = Field(..., min_length=2, max_length=255)
    clinic_name: str = Field("", max_length=255)
    phone: str = Field("", max_length=50)
    position: str = Field("Гигиенист-стоматологический", max_length=255)


class LoginResponse(BaseModel):
    token: str
    user: dict


# Rate limiting: track failed attempts per IP
_login_attempts: dict[str, list[float]] = {}
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 300  # 5 min


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    # Support legacy SHA256 hashes for migration
    import hashlib
    if len(hashed) == 64 and hashed == hashlib.sha256(password.encode()).hexdigest():
        return True
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _check_rate_limit(ip: str):
    now = datetime.now(UTC).timestamp()
    attempts = _login_attempts.get(ip, [])
    attempts = [t for t in attempts if now - t < WINDOW_SECONDS]
    _login_attempts[ip] = attempts
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Слишком много попыток. Подождите 5 минут.")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Не авторизован")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Сессия истекла")
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


@router.post("/auth/login", response_model=LoginResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        # Track failed attempt
        now = datetime.now(UTC).timestamp()
        _login_attempts.setdefault(client_ip, []).append(now)
        logger.warning(f"Failed login: user='{body.username}' ip={client_ip}")
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    # Check email verification (admin always verified)
    if user.role != "admin" and not user.is_verified:
        raise HTTPException(status_code=403, detail="Email не подтверждён. Проверьте почту или нажмите «Отправить повторно».")

    token = create_token(user.id)
    user.last_login = datetime.now(UTC)
    db.commit()

    logger.info(f"Login success: user='{user.username}' ip={client_ip}")
    return LoginResponse(
        token=token,
        user={"id": user.id, "username": user.username, "fio": user.fio, "role": user.role},
    )


@router.post("/auth/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Этот логин уже занят")

    import secrets
    verify_token = secrets.token_urlsafe(32)

    user = AdminUser(
        username=body.username,
        password_hash=hash_password(body.password),
        fio=body.fio,
        phone=getattr(body, "phone", None) or "",
        position=getattr(body, "position", None) or "",
        clinic_name=getattr(body, "clinic_name", None) or "",
        role="doctor",
        is_verified=False,
        verification_token=verify_token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email
    try:
        from app.services.email_service import send_verification_email
        send_verification_email(body.username, body.fio, verify_token)
    except Exception as e:
        logger.error(f"Verification email failed: {e}")

    return {
        "message": "Регистрация успешна! Проверьте почту для подтверждения.",
        "requires_verification": True,
        "user": {"id": user.id, "username": user.username, "fio": user.fio, "role": user.role},
    }


@router.get("/auth/verify/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    from fastapi.responses import RedirectResponse
    user = db.query(AdminUser).filter(AdminUser.verification_token == token).first()
    if not user:
        return RedirectResponse(url="/login?verified=error", status_code=302)
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return RedirectResponse(url="/login?verified=success", status_code=302)


@router.post("/auth/resend-verification")
def resend_verification(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.is_verified:
        return {"message": "Email уже подтверждён"}
    import secrets
    user.verification_token = secrets.token_urlsafe(32)
    db.commit()
    try:
        from app.services.email_service import send_verification_email
        send_verification_email(user.username, user.fio, user.verification_token)
    except Exception as e:
        logger.error(f"Resend verification failed: {e}")
    return {"message": "Письмо отправлено повторно"}


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=200)


@router.post("/auth/change-password")
def change_password(body: ChangePasswordRequest, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True, "message": "Пароль изменён"}


@router.get("/auth/me")
def me(user: AdminUser = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "fio": user.fio, "role": user.role}
