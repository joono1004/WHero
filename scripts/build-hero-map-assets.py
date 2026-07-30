"""Build reproducible map outlines and face-first circular hero badges."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "public" / "art" / "heroes"
BADGE_SIZE = 320

# Pixel crops are deliberately face-first. The resulting face/head occupies
# roughly 80% of the circular badge instead of showing the hero's full body.
FACE_CROPS = {
    "guan-yu": (430, 170, 770, 610),
    "huang-zhong": (340, 145, 690, 625),
    "wei-yan": (435, 165, 815, 665),
    "zhao-yun": (430, 145, 800, 590),
}


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", lossless=True, method=6)


def build_character_outline(source: Image.Image) -> Image.Image:
    alpha = source.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(25))
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

    face = ImageOps.fit(
        source.crop(crop_box),
        (278, 278),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.48),
    )
    face_mask = Image.new("L", (278, 278), 0)
    ImageDraw.Draw(face_mask).ellipse((0, 0, 277, 277), fill=255)
    canvas.alpha_composite(Image.composite(face, Image.new("RGBA", face.size), face_mask), (21, 21))

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
    for hero_id, crop_box in FACE_CROPS.items():
        source = Image.open(HERO_DIR / f"{hero_id}-chibi-map-v2.webp").convert("RGBA")
        save_webp(
            build_character_outline(source),
            HERO_DIR / f"{hero_id}-chibi-outline-v5.webp",
        )
        save_webp(
            build_badge(source, crop_box),
            HERO_DIR / f"{hero_id}-chibi-badge-v4.webp",
        )
        save_webp(
            build_badge_outline(),
            HERO_DIR / f"{hero_id}-chibi-badge-outline-v4.webp",
        )


if __name__ == "__main__":
    main()
