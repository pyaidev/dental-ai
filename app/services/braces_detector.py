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
    Uses YOLO first (trained model), HSV as secondary signal.
    Returns: {"has_braces": bool, "has_implants": bool, "confidence": float}
    """
    # Try YOLO first (most reliable if model exists)
    yolo_result = {"has_braces": False, "has_implants": False, "confidence": 0}
    if is_braces_model_available():
        try:
            yolo_result = _detect_yolo(image_path)
            if yolo_result["has_braces"] or yolo_result["has_implants"]:
                return yolo_result
        except Exception:
            pass

    # HSV as fallback — only high confidence results
    hsv_result = _detect_hsv(image_path)

    return {
        "has_braces": hsv_result["has_braces"],
        "has_implants": yolo_result["has_implants"],
        "confidence": hsv_result["confidence"] if hsv_result["has_braces"] else 0,
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
    h_img, w_img = img.shape[:2]
    total_pixels = h_img * w_img

    # 1. Metal brackets: low saturation, medium-high value (silver)
    metal_mask = cv2.inRange(hsv, np.array([0, 0, 120]), np.array([180, 50, 220]))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    metal_mask = cv2.morphologyEx(metal_mask, cv2.MORPH_OPEN, kernel)
    metal_ratio = cv2.countNonZero(metal_mask) / total_pixels

    # 2. Colored ligatures — only vivid small spots (not plaque indicator which covers large areas)
    # Vivid blue (not purple/violet plaque indicator)
    blue_mask = cv2.inRange(hsv, np.array([95, 150, 80]), np.array([125, 255, 255]))
    # Vivid green
    green_mask = cv2.inRange(hsv, np.array([40, 150, 80]), np.array([80, 255, 255]))
    # Vivid red/pink (small spots only)
    red_mask1 = cv2.inRange(hsv, np.array([0, 150, 100]), np.array([8, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([172, 150, 100]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(red_mask1, red_mask2)

    colored_mask = cv2.bitwise_or(blue_mask, cv2.bitwise_or(green_mask, red_mask))
    colored_mask = cv2.morphologyEx(colored_mask, cv2.MORPH_OPEN, kernel)
    colored_ratio = cv2.countNonZero(colored_mask) / total_pixels

    # 3. Small bright spots pattern (brackets are small repeating metallic squares)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Detect bright small blobs
    _, bright = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
    bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # Count small square-ish bright blobs (bracket-like)
    bracket_blobs = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 50 < area < 3000:  # Small bracket-sized blobs
            x, y, bw, bh = cv2.boundingRect(cnt)
            aspect = bw / max(bh, 1)
            if 0.3 < aspect < 3.0:  # Roughly square
                bracket_blobs += 1

    # 4. Horizontal wire lines
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=60, maxLineGap=15)
    horizontal_lines = 0
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            if angle < 20 or angle > 160:
                horizontal_lines += 1

    # 5. Check if photo has plaque indicator (purple/violet stain) — if yes, skip braces detection
    purple_mask = cv2.inRange(hsv, np.array([110, 40, 50]), np.array([170, 255, 255]))
    purple_ratio = cv2.countNonZero(purple_mask) / total_pixels
    has_plaque_indicator = purple_ratio > 0.05  # >5% purple = plaque indicator photo

    # Decision: require WIRE + (metal OR colored OR blobs), but NOT if plaque indicator present
    has_wire = horizontal_lines > 10
    has_metal = metal_ratio > 0.06
    has_colored = colored_ratio > 0.005
    has_blobs = bracket_blobs > 8

    if has_plaque_indicator:
        # Plaque indicator photo — metal and wire unreliable, but colored ligatures are reliable
        has_braces = has_colored and (has_wire or has_blobs or has_metal)
    else:
        has_braces = has_wire and (has_metal or has_colored or has_blobs)

    score = 0
    if has_wire: score += 3
    if has_metal: score += 3
    if has_colored: score += 2
    if has_blobs: score += 2
    confidence = min(score / 10, 1.0) if has_braces else 0.0

    return {
        "has_braces": has_braces,
        "has_implants": False,
        "confidence": round(confidence, 2),
    }
