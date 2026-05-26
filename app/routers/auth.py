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

    token = create_token(user.id)
    user.last_login = datetime.now(UTC)
    db.commit()

    logger.info(f"Login success: user='{user.username}' ip={client_ip}")
    return LoginResponse(
        token=token,
        user={"id": user.id, "username": user.username, "fio": user.fio, "role": user.role},
    )


@router.get("/auth/me")
def me(user: AdminUser = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "fio": user.fio, "role": user.role}
