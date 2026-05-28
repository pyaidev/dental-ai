"""Auto-detect dental photo angle: front, left, right."""

import cv2
import numpy as np
from PIL import Image
from pathlib import Path


def detect_angle(image_path: str) -> str:
    """Detect dental photo angle using image symmetry analysis.

    Returns: 'front', 'left', or 'right'

    Logic:
    - Front photos are roughly symmetric (left half ≈ right half)
    - Left/right photos show more teeth on one side
    - Mirror comparison + edge density analysis
    """
    ext = Path(image_path).suffix.lower()
    if ext in (".webp",):
        img = cv2.cvtColor(np.array(Image.open(image_path).convert("RGB")), cv2.COLOR_RGB2BGR)
    else:
        img = cv2.imread(image_path)

    if img is None:
        return "front"

    h, w = img.shape[:2]
    if w > 640:
        scale = 640 / w
        img = cv2.resize(img, (640, int(h * scale)))
        h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Split into left and right halves
    mid = w // 2
    left_half = gray[:, :mid]
    right_half = gray[:, mid:]

    # Flip right half for comparison
    right_flipped = cv2.flip(right_half, 1)

    # Resize to same size
    min_w = min(left_half.shape[1], right_flipped.shape[1])
    left_half = left_half[:, :min_w]
    right_flipped = right_flipped[:, :min_w]

    # Symmetry score (lower = more symmetric = frontal)
    diff = cv2.absdiff(left_half, right_flipped)
    symmetry_score = np.mean(diff)

    # Edge density per half (more edges = more visible teeth)
    edges_left = cv2.Canny(gray[:, :mid], 50, 150)
    edges_right = cv2.Canny(gray[:, mid:], 50, 150)
    density_left = np.mean(edges_left)
    density_right = np.mean(edges_right)

    # Color distribution (dental photos have specific color patterns)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    left_brightness = np.mean(hsv[:, :mid, 2])
    right_brightness = np.mean(hsv[:, mid:, 2])

    # Decision
    if symmetry_score < 25:
        return "front"  # Symmetric = frontal view

    # Asymmetric — determine which side
    brightness_diff = left_brightness - right_brightness
    density_diff = density_left - density_right

    if brightness_diff > 5 or density_diff > 3:
        return "right"  # More detail on left side of image = right side view
    elif brightness_diff < -5 or density_diff < -3:
        return "left"
    else:
        return "front"  # Uncertain → default to front
