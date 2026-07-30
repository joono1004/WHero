"""Build reproducible map outlines and face-first circular hero badges."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "public" / "art" / "heroes"
BADGE_SIZE = 320

# Pixel crops are deliberately face-first. The resulting face/head occupies
# roughly 80% of the circular badge instead of showing the hero's full body.
HERO_SPECS = {
    # outline_filter compensates for each hero's different rendered scale so
    # every contour has the same apparent thickness as Guan Yu on the map.
    "guan-yu": {"face_crop": (360, 140, 830, 720), "outline_filter": 25},
    "huang-zhong": {"face_crop": (300, 120, 730, 710), "outline_filter": 33},
    "wei-yan": {"face_crop": (380, 125, 860, 735), "outline_filter": 33},
    "zhao-yun": {"face_crop": (370, 115, 850, 670), "outline_filter": 27},
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
        (258, 258),
        method=Image.Resampling.LANCZOS,
    )
    face_layer = Image.new("RGBA", (278, 278), (0, 0, 0, 0))
    face_layer.alpha_composite(
        face,
        ((278 - face.width) // 2, (278 - face.height) // 2 + 4),
    )
    circle_mask = Image.new("L", (278, 278), 0)
    ImageDraw.Draw(circle_mask).ellipse((0, 0, 277, 277), fill=255)
    face_layer.putalpha(ImageChops.multiply(face_layer.getchannel("A"), circle_mask))
    canvas.alpha_composite(face_layer, (21, 21))

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
            HERO_DIR / f"{hero_id}-chibi-badge-v4.webp",
        )
        save_webp(
            build_badge_outline(),
            HERO_DIR / f"{hero_id}-chibi-badge-outline-v4.webp",
        )


if __name__ == "__main__":
    main()
