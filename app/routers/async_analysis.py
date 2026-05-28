"""Async analysis via Celery with progress tracking."""

import json
import uuid
from pathlib import Path

import redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser
from app.routers.auth import get_current_user
from app.config import settings

router = APIRouter()

try:
    _redis = redis.Redis(host="localhost", port=6379, db=3, decode_responses=True)
    _redis.ping()
except Exception:
    _redis = None


@router.get("/analysis-status/{task_id}")
def get_analysis_status(task_id: str, user: AdminUser = Depends(get_current_user)):
    """Poll analysis progress."""
    if not _redis:
        return {"status": "unknown", "progress": 0}

    data = _redis.get(f"analysis_progress:{task_id}")
    if not data:
        return {"status": "not_found", "progress": 0}

    return json.loads(data)


def update_progress(task_id: str, status: str, progress: int, message: str = "", result: dict | None = None):
    """Update analysis progress in Redis."""
    if not _redis:
        return
    data = {"status": status, "progress": progress, "message": message}
    if result:
        data["result"] = result
    _redis.setex(f"analysis_progress:{task_id}", 600, json.dumps(data))
