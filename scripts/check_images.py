from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
image_dir = ROOT / "assets" / "images"
required = [line.strip() for line in (ROOT / "required_images.txt").read_text(encoding="utf-8").splitlines() if line.strip()]

missing = [name for name in required if not (image_dir / name).exists()]
print(f"Required images: {len(required)}")
print(f"Missing images: {len(missing)}")

if missing:
    print("\nMissing files:")
    for name in missing:
        print(name)
else:
    print("\nAll required images are present.")
