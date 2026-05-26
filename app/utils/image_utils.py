import cv2
import numpy as np
from pathlib import Path
from PIL import Image

from app.config import settings


def load_and_resize(image_path: str) -> np.ndarray:
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


def validate_image(file_path: str) -> bool:
    try:
        with Image.open(file_path) as im:
            im.verify()
        return True
    except Exception:
        return False
