"""Tests for braces/implant auto-detection."""
import io
import cv2
import numpy as np


def test_detect_preview_no_auth(client):
    resp = client.post("/api/detect-preview", files={"photo": ("t.jpg", io.BytesIO(b"x"), "image/jpeg")})
    assert resp.status_code == 401


def test_detect_preview_invalid_image(client, auth_headers):
    resp = client.post("/api/detect-preview", headers=auth_headers,
        files={"photo": ("test.jpg", io.BytesIO(b"not_an_image"), "image/jpeg")})
    assert resp.status_code == 400


def test_detect_preview_valid(client, auth_headers, tmp_path):
    # Create a simple test image
    img = np.zeros((200, 300, 3), dtype=np.uint8)
    img[50:150, 50:250] = [200, 200, 200]  # grey area
    path = str(tmp_path / "test.jpg")
    cv2.imwrite(path, img)
    with open(path, "rb") as f:
        resp = client.post("/api/detect-preview", headers=auth_headers,
            files={"photo": ("test.jpg", f, "image/jpeg")})
    assert resp.status_code == 200
    data = resp.json()
    assert "has_braces" in data
    assert "has_implants" in data
    assert "confidence" in data


def test_braces_detector_hsv():
    from app.services.braces_detector import _detect_hsv
    import tempfile, os
    # Create image with metallic areas (simulated braces)
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    img[100:300, 100:500] = [180, 180, 190]  # silver/metal
    path = tempfile.mktemp(suffix=".jpg")
    cv2.imwrite(path, img)
    result = _detect_hsv(path)
    os.unlink(path)
    assert isinstance(result["has_braces"], bool)
    assert 0 <= result["confidence"] <= 1


def test_braces_detector_no_metal():
    from app.services.braces_detector import _detect_hsv
    import tempfile, os
    # Dark image with no metal
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    img[100:300, 100:500] = [50, 30, 80]  # dark purple (plaque)
    path = tempfile.mktemp(suffix=".jpg")
    cv2.imwrite(path, img)
    result = _detect_hsv(path)
    os.unlink(path)
    assert result["has_braces"] == False
