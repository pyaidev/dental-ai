from pathlib import Path
from io import BytesIO

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from PIL import Image

from app.models import AdminUser
from app.routers.auth import get_current_user
from app.services.braces_detector import detect_braces_implants
from app.services.angle_detector import detect_angle
from app.config import settings

router = APIRouter()


@router.post("/detect-preview")
async def detect_preview(
    photo: UploadFile = File(...),
    user: AdminUser = Depends(get_current_user),
):
    """Quick detect braces/implants from uploaded photo before full analysis."""
    content = await photo.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    try:
        img = Image.open(BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    # Save temp file
    import uuid
    tmp_path = str(Path(settings.upload_dir) / f"preview_{uuid.uuid4().hex[:8]}.jpg")
    Path(tmp_path).write_bytes(content)

    result = detect_braces_implants(tmp_path)
    angle = detect_angle(tmp_path)

    # Cleanup
    Path(tmp_path).unlink(missing_ok=True)

    return {**result, "angle": angle}
