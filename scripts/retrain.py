"""Retrain YOLO models with new photos.
Usage: python scripts/retrain.py --photos /path/to/photos --epochs 50
"""

import argparse
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from ultralytics import YOLO


def create_dataset(photos_dir: str, output_dir: str):
    """Create YOLO dataset from dental photos with HSV auto-labeling."""
    base = Path(output_dir)
    for split in ["train", "val"]:
        (base / split / "images").mkdir(parents=True, exist_ok=True)
        (base / split / "labels").mkdir(parents=True, exist_ok=True)

    photos = list(Path(photos_dir).glob("*.*"))
    photos = [p for p in photos if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
    print(f"Found {len(photos)} photos")

    for idx, photo in enumerate(photos):
        try:
            img_pil = Image.open(photo).convert("RGB")
            img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
            img = cv2.resize(img, (640, 640))
        except Exception as e:
            print(f"Skip {photo.name}: {e}")
            continue

        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Plaque mask
        plaque_mask = cv2.inRange(hsv, np.array([100, 50, 50]), np.array([165, 255, 255]))
        enamel_mask = cv2.inRange(hsv, np.array([10, 0, 130]), np.array([35, 90, 255]))

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        plaque_mask = cv2.morphologyEx(plaque_mask, cv2.MORPH_OPEN, kernel)
        plaque_mask = cv2.morphologyEx(plaque_mask, cv2.MORPH_CLOSE, kernel)
        enamel_mask = cv2.morphologyEx(enamel_mask, cv2.MORPH_OPEN, kernel)

        split = "val" if idx % 10 == 0 else "train"
        name = f"img_{idx:04d}"
        cv2.imwrite(str(base / split / "images" / f"{name}.jpg"), img)

        lines = []
        for cls_id, mask in [(0, plaque_mask), (1, enamel_mask)]:
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) < 500:
                    continue
                epsilon = 0.02 * cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, epsilon, True)
                if len(approx) < 3:
                    continue
                points = []
                for pt in approx:
                    px, py = pt[0]
                    points.append(f"{px/w:.6f}")
                    points.append(f"{py/h:.6f}")
                lines.append(f"{cls_id} {' '.join(points)}")

        with open(base / split / "labels" / f"{name}.txt", "w") as f:
            f.write("\n".join(lines))

        # Augment
        for aug_name, aug_img in [("hflip", cv2.flip(img, 1)), ("bright", cv2.convertScaleAbs(img, alpha=1.3, beta=20))]:
            aug_n = f"img_{idx:04d}_{aug_name}"
            cv2.imwrite(str(base / "train" / "images" / f"{aug_n}.jpg"), aug_img)
            with open(base / "train" / "labels" / f"{aug_n}.txt", "w") as f:
                f.write("\n".join(lines))

    # YAML
    yaml = f"""path: {base.resolve()}
train: train/images
val: val/images

names:
  0: plaque
  1: clean_tooth
"""
    (base / "data.yaml").write_text(yaml)
    train_n = len(list((base / "train" / "images").glob("*.jpg")))
    val_n = len(list((base / "val" / "images").glob("*.jpg")))
    print(f"Dataset: train={train_n}, val={val_n}")
    return str(base / "data.yaml")


def train(data_yaml: str, epochs: int = 50):
    model = YOLO("yolov8n-seg.pt")
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=640,
        batch=4,
        project="ml/runs",
        name="dental_plaque_retrain",
        patience=15,
    )
    print(f"Done! Best: {results.save_dir}/weights/best.pt")

    # Copy to active model
    import shutil
    dst = Path("ml/runs/dental_plaque_v1/weights/best.pt")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(f"{results.save_dir}/weights/best.pt", dst)
    print(f"Copied to {dst}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--photos", required=True, help="Directory with dental photos")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--output", default="ml/retrain_dataset")
    args = parser.parse_args()

    yaml = create_dataset(args.photos, args.output)
    train(yaml, args.epochs)
