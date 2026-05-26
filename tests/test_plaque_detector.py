"""Tests for plaque detection service."""

import os
import numpy as np
import cv2
import pytest

from app.services.plaque_detector import detect_plaque, create_overlay, analyze_zones


@pytest.fixture
def sample_image(tmp_path):
    """Create a synthetic test image with purple plaque and white enamel."""
    img = np.zeros((400, 600, 3), dtype=np.uint8)

    # White enamel area (center)
    img[100:300, 100:500] = [220, 220, 230]  # Light yellowish white

    # Purple plaque areas
    img[120:200, 120:300] = [180, 50, 150]  # Purple/violet
    img[220:280, 200:400] = [150, 30, 130]  # Darker purple

    path = str(tmp_path / "test_teeth.jpg")
    cv2.imwrite(path, img)
    return path


@pytest.fixture
def overlay_path(tmp_path):
    return str(tmp_path / "test_overlay.jpg")


def test_detect_plaque_returns_result(sample_image, overlay_path):
    result = detect_plaque(sample_image, overlay_path)
    assert result.plaque_percent >= 0
    assert result.plaque_percent <= 100
    assert result.plaque_pixels >= 0
    assert result.total_tooth_pixels >= 0
    assert os.path.exists(result.overlay_path)


def test_detect_plaque_zone_data(sample_image, overlay_path):
    result = detect_plaque(sample_image, overlay_path)
    assert isinstance(result.zone_data, dict)
    assert "upper_left" in result.zone_data
    assert "lower_center" in result.zone_data
    assert len(result.zone_data) == 6


def test_create_overlay_shape():
    img = np.zeros((200, 300, 3), dtype=np.uint8)
    plaque = np.zeros((200, 300), dtype=np.uint8)
    enamel = np.zeros((200, 300), dtype=np.uint8)
    plaque[50:100, 50:150] = 255
    enamel[100:150, 50:150] = 255

    overlay = create_overlay(img, plaque, enamel)
    assert overlay.shape == img.shape


def test_analyze_zones_all_zero():
    plaque = np.zeros((200, 300), dtype=np.uint8)
    teeth = np.zeros((200, 300), dtype=np.uint8)
    zones = analyze_zones(plaque, teeth)
    assert all(v == 0.0 for v in zones.values())


def test_analyze_zones_full_plaque():
    mask = np.ones((200, 300), dtype=np.uint8) * 255
    zones = analyze_zones(mask, mask)
    assert all(v == 100.0 for v in zones.values())


def test_invalid_image(tmp_path, overlay_path):
    bad_path = str(tmp_path / "nonexistent.jpg")
    with pytest.raises(ValueError):
        detect_plaque(bad_path, overlay_path)
