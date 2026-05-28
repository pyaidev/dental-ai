import cv2
import numpy as np
from pathlib import Path
from PIL import Image

from app.config import settings


def load_and_resize(image_path: str) -> np.ndarray:
    ext = Path(image_path).suffix.lower()
    if ext in (".webp",):
        img_pil = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    else:
        img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    h, w = img.shape[:2]
    max_w = settings.image_max_width
    if w > max_w:
        scale = max_w / w
        img = cv2.resize(img, (max_w, int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def save_image(img: np.ndarray, path: str) -> str:
    cv2.imwrite(path, img)
    return path


def compress_to_webp(input_path: str, quality: int = 80) -> str:
    """Compress image to WebP format for storage savings."""
    img = Image.open(input_path).convert("RGB")
    webp_path = str(Path(input_path).with_suffix(".webp"))
    img.save(webp_path, "WEBP", quality=quality, method=4)
    # Remove original if different
    if input_path != webp_path and Path(input_path).exists():
        Path(input_path).unlink()
    return webp_path


def validate_image(file_path: str) -> bool:
    try:
        with Image.open(file_path) as im:
            im.verify()
        return True
    except Exception:
        return False
