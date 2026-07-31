"""Build reproducible map outlines and face-first circular hero badges."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "public" / "art" / "heroes"
BADGE_SIZE = 320

# Pixel crops are deliberately face-first. Keep the complete headgear, hair
# and beard while excluding most shoulders and weapons, so the face remains
# recognizable at the smallest map zoom.
HERO_SPECS = {
    # outline_filter compensates for each hero's different rendered scale so
    # every contour has the same apparent thickness as Guan Yu on the map.
    "guan-yu": {"face_crop": (390, 140, 800, 650), "outline_filter": 25},
    "huang-zhong": {"face_crop": (325, 120, 705, 640), "outline_filter": 33},
    "wei-yan": {"face_crop": (410, 125, 830, 655), "outline_filter": 33},
    "zhao-yun": {"face_crop": (400, 115, 820, 600), "outline_filter": 27},
}


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", lossless=True, method=6)


def build_character_outline(source: Image.Image, filter_size: int) -> Image.Image:
    alpha = source.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(filter_size))
    ring_alpha = ImageChops.subtract(expanded, alpha)
    ring = Image.new("RGBA", source.size, (255, 255, 255, 0))
    ring.putalpha(ring_alpha)
    return ring


def build_badge(source: Image.Image, crop_box: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (BADGE_SIZE, BADGE_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # A subdued neutral field keeps the face readable over every terrain.
    draw.ellipse((15, 15, 305, 305), fill=(27, 39, 43, 255))
    draw.ellipse((23, 23, 297, 297), fill=(61, 76, 72, 255))

    # Preserve the complete head, face, beard and headgear. `contain` avoids
    # the corner/edge cropping caused by square `fit` inside a round mask.
    face = ImageOps.contain(
        source.crop(crop_box),
        (270, 270),
        method=Image.Resampling.LANCZOS,
    )
    face_layer = Image.new("RGBA", (282, 282), (0, 0, 0, 0))
    face_layer.alpha_composite(
        face,
        ((282 - face.width) // 2, (282 - face.height) // 2 + 2),
    )
    circle_mask = Image.new("L", (282, 282), 0)
    ImageDraw.Draw(circle_mask).ellipse((0, 0, 281, 281), fill=255)
    face_layer.putalpha(ImageChops.multiply(face_layer.getchannel("A"), circle_mask))
    canvas.alpha_composite(face_layer, (19, 19))

    # Neutral inner keyline; the grade colour is supplied by a separate ring.
    draw.ellipse((20, 20, 300, 300), outline=(15, 20, 22, 235), width=6)
    return canvas


def build_badge_outline() -> Image.Image:
    ring = Image.new("RGBA", (BADGE_SIZE, BADGE_SIZE), (255, 255, 255, 0))
    draw = ImageDraw.Draw(ring)
    draw.ellipse((7, 7, 313, 313), outline=(255, 255, 255, 255), width=14)
    draw.ellipse((20, 20, 300, 300), outline=(255, 255, 255, 190), width=4)
    return ring


def main() -> None:
    for hero_id, spec in HERO_SPECS.items():
        source = Image.open(HERO_DIR / f"{hero_id}-chibi-map-v2.webp").convert("RGBA")
        save_webp(
            build_character_outline(source, spec["outline_filter"]),
            HERO_DIR / f"{hero_id}-chibi-outline-v5.webp",
        )
        save_webp(
            build_badge(source, spec["face_crop"]),
            HERO_DIR / f"{hero_id}-chibi-badge-v5.webp",
        )
        save_webp(
            build_badge_outline(),
            HERO_DIR / f"{hero_id}-chibi-badge-outline-v4.webp",
        )


if __name__ == "__main__":
    main()
