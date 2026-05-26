import cv2
import numpy as np
from dataclasses import dataclass, field
from PIL import Image
from pathlib import Path

from app.config import settings
from app.utils.image_utils import save_image


@dataclass
class PlaqueResult:
    plaque_percent: float
    plaque_pixels: int
    total_tooth_pixels: int
    overlay_path: str
    zone_data: dict = field(default_factory=dict)


def load_image(image_path: str) -> np.ndarray:
    """Load image supporting WEBP and standard formats."""
    ext = Path(image_path).suffix.lower()
    if ext in (".webp", ".WEBP"):
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


def detect_plaque(image_path: str, overlay_save_path: str) -> PlaqueResult:
    # Try YOLO model first if available
    try:
        from app.services.yolo_detector import is_yolo_available, detect_plaque_yolo
        if is_yolo_available():
            yolo_result = detect_plaque_yolo(image_path, overlay_save_path)
            return PlaqueResult(
                plaque_percent=yolo_result.plaque_percent,
                plaque_pixels=yolo_result.plaque_pixels,
                total_tooth_pixels=yolo_result.total_tooth_pixels,
                overlay_path=yolo_result.overlay_path,
                zone_data=yolo_result.zone_data,
            )
    except Exception:
        pass  # Fallback to HSV

    # HSV-based detection (fallback)
    img = load_image(image_path)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Plaque mask: blue-purple stain from dental indicator
    plaque_lower = np.array([settings.plaque_h_min, settings.plaque_s_min, settings.plaque_v_min])
    plaque_upper = np.array([settings.plaque_h_max, settings.plaque_s_max, settings.plaque_v_max])
    plaque_mask = cv2.inRange(hsv, plaque_lower, plaque_upper)

    # Clean enamel mask: yellowish-white tooth surface
    enamel_lower = np.array([settings.enamel_h_min, settings.enamel_s_min, settings.enamel_v_min])
    enamel_upper = np.array([settings.enamel_h_max, settings.enamel_s_max, settings.enamel_v_max])
    enamel_mask = cv2.inRange(hsv, enamel_lower, enamel_upper)

    # Exclude dark background (V < 40)
    dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 40]))
    plaque_mask = cv2.bitwise_and(plaque_mask, cv2.bitwise_not(dark_mask))
    enamel_mask = cv2.bitwise_and(enamel_mask, cv2.bitwise_not(dark_mask))

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    plaque_mask = cv2.morphologyEx(plaque_mask, cv2.MORPH_OPEN, kernel)
    plaque_mask = cv2.morphologyEx(plaque_mask, cv2.MORPH_CLOSE, kernel)
    enamel_mask = cv2.morphologyEx(enamel_mask, cv2.MORPH_OPEN, kernel)
    enamel_mask = cv2.morphologyEx(enamel_mask, cv2.MORPH_CLOSE, kernel)

    # Total tooth area
    teeth_mask = cv2.bitwise_or(plaque_mask, enamel_mask)

    plaque_pixels = int(cv2.countNonZero(plaque_mask))
    total_pixels = int(cv2.countNonZero(teeth_mask))

    if total_pixels == 0:
        plaque_pct = 0.0
    else:
        plaque_pct = round((plaque_pixels / total_pixels) * 100, 1)

    # Generate overlay
    overlay = create_overlay(img, plaque_mask, enamel_mask)
    save_image(overlay, overlay_save_path)

    # Zone analysis
    zone_data = analyze_zones(plaque_mask, teeth_mask)

    return PlaqueResult(
        plaque_percent=plaque_pct,
        plaque_pixels=plaque_pixels,
        total_tooth_pixels=total_pixels,
        overlay_path=overlay_save_path,
        zone_data=zone_data,
    )


def create_overlay(original: np.ndarray, plaque_mask: np.ndarray, enamel_mask: np.ndarray) -> np.ndarray:
    overlay = original.copy()

    # Red for plaque, green for clean
    red_layer = np.zeros_like(original)
    red_layer[:, :] = (0, 0, 220)
    green_layer = np.zeros_like(original)
    green_layer[:, :] = (0, 200, 0)

    plaque_colored = cv2.bitwise_and(red_layer, red_layer, mask=plaque_mask)
    clean_colored = cv2.bitwise_and(green_layer, green_layer, mask=enamel_mask)

    # Blend
    alpha = 0.4
    mask_combined = cv2.bitwise_or(plaque_mask, enamel_mask)
    mask_3ch = cv2.cvtColor(mask_combined, cv2.COLOR_GRAY2BGR) / 255.0

    colored = cv2.add(plaque_colored, clean_colored)
    overlay = (original * (1 - mask_3ch * alpha) + colored * (mask_3ch * alpha)).astype(np.uint8)

    # Add percentage text
    plaque_px = cv2.countNonZero(plaque_mask)
    total_px = cv2.countNonZero(mask_combined)
    if total_px > 0:
        pct = round(plaque_px / total_px * 100, 1)
        cv2.putText(overlay, f"{pct}%", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

    return overlay


def analyze_zones(plaque_mask: np.ndarray, teeth_mask: np.ndarray) -> dict:
    h, w = plaque_mask.shape
    rows, cols = 2, 3
    zone_h, zone_w = h // rows, w // cols

    zone_names = [
        ["upper_left", "upper_center", "upper_right"],
        ["lower_left", "lower_center", "lower_right"],
    ]

    zones = {}
    for r in range(rows):
        for c in range(cols):
            y1, y2 = r * zone_h, (r + 1) * zone_h
            x1, x2 = c * zone_w, (c + 1) * zone_w

            zone_plaque = cv2.countNonZero(plaque_mask[y1:y2, x1:x2])
            zone_teeth = cv2.countNonZero(teeth_mask[y1:y2, x1:x2])

            if zone_teeth > 0:
                zones[zone_names[r][c]] = round(zone_plaque / zone_teeth * 100, 1)
            else:
                zones[zone_names[r][c]] = 0.0

    return zones
