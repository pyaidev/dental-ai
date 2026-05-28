"""YOLO-based plaque detection — used when trained model is available."""

import cv2
import numpy as np
from dataclasses import dataclass, field
from pathlib import Path
from PIL import Image

from app.utils.image_utils import save_image

YOLO_MODEL_PATH = Path("ml/runs/dental_plaque_v1/weights/best.pt")


@dataclass
class YoloPlaqueResult:
    plaque_percent: float
    plaque_pixels: int
    total_tooth_pixels: int
    overlay_path: str
    zone_data: dict = field(default_factory=dict)


def is_yolo_available() -> bool:
    return YOLO_MODEL_PATH.exists()


_cached_model = None

def _get_model():
    global _cached_model
    if _cached_model is None:
        from ultralytics import YOLO
        _cached_model = YOLO(str(YOLO_MODEL_PATH))
    return _cached_model


def detect_plaque_yolo(image_path: str, overlay_save_path: str) -> YoloPlaqueResult:
    """Detect plaque using trained YOLO segmentation model."""
    model = _get_model()

    # Load image
    ext = Path(image_path).suffix.lower()
    if ext in (".webp",):
        img_pil = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    else:
        img = cv2.imread(image_path)

    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    # Run inference
    results = model(img, verbose=False)[0]

    h, w = img.shape[:2]
    plaque_mask = np.zeros((h, w), dtype=np.uint8)
    tooth_mask = np.zeros((h, w), dtype=np.uint8)

    if results.masks is not None:
        for i, (mask, cls) in enumerate(zip(results.masks.data, results.boxes.cls)):
            mask_np = mask.cpu().numpy()
            mask_resized = cv2.resize(mask_np, (w, h))
            binary = (mask_resized > 0.5).astype(np.uint8) * 255

            cls_id = int(cls.item())
            if cls_id == 0:  # plaque
                plaque_mask = cv2.bitwise_or(plaque_mask, binary)
            elif cls_id == 1:  # clean_tooth
                tooth_mask = cv2.bitwise_or(tooth_mask, binary)

    # Total teeth = plaque + clean
    total_mask = cv2.bitwise_or(plaque_mask, tooth_mask)

    plaque_pixels = int(cv2.countNonZero(plaque_mask))
    total_pixels = int(cv2.countNonZero(total_mask))

    if total_pixels == 0:
        plaque_pct = 0.0
    else:
        plaque_pct = round((plaque_pixels / total_pixels) * 100, 1)

    # Create overlay
    overlay = img.copy()
    red = np.zeros_like(img); red[:, :] = (0, 0, 220)
    green = np.zeros_like(img); green[:, :] = (0, 200, 0)
    plaque_colored = cv2.bitwise_and(red, red, mask=plaque_mask)
    clean_colored = cv2.bitwise_and(green, green, mask=tooth_mask)
    mask_3ch = cv2.cvtColor(total_mask, cv2.COLOR_GRAY2BGR) / 255.0
    colored = cv2.add(plaque_colored, clean_colored)
    alpha = 0.4
    overlay = (img * (1 - mask_3ch * alpha) + colored * (mask_3ch * alpha)).astype(np.uint8)
    cv2.putText(overlay, f"{plaque_pct}%", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

    save_image(overlay, overlay_save_path)

    # Zone analysis (3x2 grid)
    zone_names = [
        ["upper_left", "upper_center", "upper_right"],
        ["lower_left", "lower_center", "lower_right"],
    ]
    rows, cols = 2, 3
    zh, zw = h // rows, w // cols
    zone_data = {}
    for r in range(rows):
        for c in range(cols):
            y1, y2 = r * zh, (r + 1) * zh
            x1, x2 = c * zw, (c + 1) * zw
            zp = cv2.countNonZero(plaque_mask[y1:y2, x1:x2])
            zt = cv2.countNonZero(total_mask[y1:y2, x1:x2])
            zone_data[zone_names[r][c]] = round(zp / zt * 100, 1) if zt > 0 else 0.0

    return YoloPlaqueResult(
        plaque_percent=plaque_pct,
        plaque_pixels=plaque_pixels,
        total_tooth_pixels=total_pixels,
        overlay_path=overlay_save_path,
        zone_data=zone_data,
    )
