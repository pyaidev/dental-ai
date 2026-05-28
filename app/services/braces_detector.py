"""Auto-detect braces and implants from dental photos."""

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

BRACES_MODEL_PATH = Path("ml/runs/dental_braces_v1/weights/best.pt")


def is_braces_model_available() -> bool:
    return BRACES_MODEL_PATH.exists()


def detect_braces_implants(image_path: str) -> dict:
    """Detect braces and implants in dental photo.
    Uses both YOLO and HSV, combines results.
    Returns: {"has_braces": bool, "has_implants": bool, "confidence": float}
    """
    # Always run HSV (fast, reliable for metal)
    hsv_result = _detect_hsv(image_path)

    # Try YOLO for implants (HSV can't detect)
    yolo_result = {"has_braces": False, "has_implants": False, "confidence": 0}
    if is_braces_model_available():
        try:
            yolo_result = _detect_yolo(image_path)
        except Exception:
            pass

    # Combine: braces from HSV (more reliable), implants from YOLO
    return {
        "has_braces": hsv_result["has_braces"] or yolo_result["has_braces"],
        "has_implants": yolo_result["has_implants"],
        "confidence": max(hsv_result["confidence"], yolo_result["confidence"]),
    }


_cached_braces_model = None

def _get_braces_model():
    global _cached_braces_model
    if _cached_braces_model is None:
        from ultralytics import YOLO
        _cached_braces_model = YOLO(str(BRACES_MODEL_PATH))
    return _cached_braces_model


def _detect_yolo(image_path: str) -> dict:
    model = _get_braces_model()

    ext = Path(image_path).suffix.lower()
    if ext in (".webp",):
        img = cv2.cvtColor(np.array(Image.open(image_path).convert("RGB")), cv2.COLOR_RGB2BGR)
    else:
        img = cv2.imread(image_path)

    results = model(img, verbose=False)[0]

    has_braces = False
    has_implants = False
    max_conf = 0.0

    if results.boxes is not None:
        for box in results.boxes:
            cls = int(box.cls.item())
            conf = float(box.conf.item())
            if cls == 2 and conf > 0.3:  # braces
                has_braces = True
                max_conf = max(max_conf, conf)
            if cls == 3 and conf > 0.3:  # implant
                has_implants = True
                max_conf = max(max_conf, conf)

    return {"has_braces": has_braces, "has_implants": has_implants, "confidence": round(max_conf, 2)}


def _detect_hsv(image_path: str) -> dict:
    """Fallback: detect metal braces by silver/metallic color."""
    ext = Path(image_path).suffix.lower()
    if ext in (".webp",):
        img = cv2.cvtColor(np.array(Image.open(image_path).convert("RGB")), cv2.COLOR_RGB2BGR)
    else:
        img = cv2.imread(image_path)

    if img is None:
        return {"has_braces": False, "has_implants": False, "confidence": 0}

    h, w = img.shape[:2]
    if w > 800:
        scale = 800 / w
        img = cv2.resize(img, (800, int(h * scale)))

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Metal braces: low saturation, medium-high value (silver brackets + wires)
    metal_lower = np.array([0, 0, 120])
    metal_upper = np.array([180, 50, 220])
    metal_mask = cv2.inRange(hsv, metal_lower, metal_upper)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    metal_mask = cv2.morphologyEx(metal_mask, cv2.MORPH_OPEN, kernel)

    metal_pixels = cv2.countNonZero(metal_mask)
    total_pixels = img.shape[0] * img.shape[1]
    metal_ratio = metal_pixels / total_pixels

    # Also detect horizontal wire lines
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=80, maxLineGap=10)
    horizontal_lines = 0
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            if angle < 15 or angle > 165:
                horizontal_lines += 1

    # Braces if >3% metal OR >5 horizontal wire lines
    has_braces = metal_ratio > 0.03 or horizontal_lines > 5
    confidence = max(min(metal_ratio * 15, 1.0), min(horizontal_lines / 20, 1.0))

    return {
        "has_braces": has_braces,
        "has_implants": False,
        "confidence": round(confidence, 2),
    }
