"""Build normalized unit sprites and compact class-symbol badges."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
UNIT_DIR = ROOT / "public" / "art" / "units"
UNIT_IDS = ("infantry", "archer", "cavalry")

SPRITE_SIZE = (1024, 1280)
SPRITE_INNER = (900, 1100)
SPRITE_BOTTOM_MARGIN = 96
BADGE_SIZE = 320
WORK_SIZE = 960


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", lossless=True, method=6)


def build_normalized_sprite(unit_id: str) -> Image.Image:
    source = Image.open(UNIT_DIR / f"{unit_id}-chibi-map-v2.webp").convert("RGBA")
    alpha_box = source.getchannel("A").getbbox()
    if not alpha_box:
        raise ValueError(f"{unit_id} has no visible pixels")

    visible = source.crop(alpha_box)
    visible = ImageOps.contain(
        visible,
        SPRITE_INNER,
        method=Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", SPRITE_SIZE, (0, 0, 0, 0))
    x = (SPRITE_SIZE[0] - visible.width) // 2
    y = SPRITE_SIZE[1] - SPRITE_BOTTOM_MARGIN - visible.height
    canvas.alpha_composite(visible, (x, y))
    return canvas


def draw_badge_base() -> Image.Image:
    size = WORK_SIZE
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((105, 126, 855, 876), fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    badge.alpha_composite(shadow)

    circle_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(circle_mask).ellipse((92, 92, 868, 868), fill=255)
    field = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = field.load()
    for y in range(92, 869):
        t = (y - 92) / 776
        red = round(53 - 25 * t)
        green = round(132 - 59 * t)
        blue = round(47 - 20 * t)
        for x in range(92, 869):
            pixels[x, y] = (red, green, blue, 255)
    field.putalpha(circle_mask)
    badge.alpha_composite(field)

    draw = ImageDraw.Draw(badge)
    draw.ellipse((92, 92, 868, 868), outline=(128, 161, 84, 255), width=24)
    draw.ellipse((116, 116, 844, 844), outline=(67, 103, 47, 210), width=12)
    draw.arc((132, 132, 828, 828), 205, 332, fill=(161, 195, 111, 150), width=10)
    return badge


def draw_sword(draw: ImageDraw.ImageDraw, offset_y: int = 0) -> None:
    white = (250, 252, 239, 255)
    shade = (205, 220, 197, 255)
    dark = (36, 68, 35, 150)
    draw.line((324, 679 + offset_y, 665, 287 + offset_y), fill=dark, width=82)
    draw.polygon(
        (
            (352, 648 + offset_y),
            (596, 348 + offset_y),
            (701, 239 + offset_y),
            (654, 379 + offset_y),
            (410, 681 + offset_y),
        ),
        fill=white,
    )
    draw.polygon(
        (
            (382, 632 + offset_y),
            (618, 350 + offset_y),
            (654, 379 + offset_y),
            (410, 681 + offset_y),
        ),
        fill=shade,
    )
    draw.line((303, 681 + offset_y, 432, 720 + offset_y), fill=white, width=43)
    draw.line((339, 714 + offset_y, 287, 776 + offset_y), fill=white, width=42)


def draw_bow(draw: ImageDraw.ImageDraw) -> None:
    white = (250, 252, 239, 255)
    dark = (35, 67, 34, 150)
    box = (232, 218, 702, 742)
    draw.arc((244, 230, 714, 754), 255, 105, fill=dark, width=50)
    draw.arc(box, 255, 105, fill=white, width=34)
    draw.line((390, 260, 390, 704), fill=white, width=18)
    draw.line((287, 486, 737, 486), fill=white, width=24)
    draw.polygon(((752, 486), (690, 446), (690, 526)), fill=white)
    draw.line((303, 456, 303, 516), fill=white, width=17)


def draw_horse(draw: ImageDraw.ImageDraw) -> None:
    white = (250, 252, 239, 255)
    shade = (216, 226, 207, 255)
    dark = (35, 67, 34, 150)
    silhouette = (
        (286, 766),
        (346, 594),
        (363, 432),
        (326, 238),
        (448, 326),
        (521, 286),
        (574, 174),
        (615, 337),
        (702, 389),
        (762, 490),
        (739, 566),
        (684, 617),
        (606, 619),
        (541, 565),
        (502, 715),
        (432, 786),
    )
    draw.polygon(tuple((x + 18, y + 20) for x, y in silhouette), fill=dark)
    draw.polygon(silhouette, fill=white)
    draw.polygon(
        ((363, 432), (448, 326), (521, 286), (489, 434), (560, 492), (502, 715), (432, 786), (346, 594)),
        fill=shade,
    )
    # Serrated mane cut-out makes the small silhouette read as a horse rather
    # than a generic animal head.
    draw.polygon(
        (
            (363, 420),
            (298, 458),
            (353, 493),
            (287, 546),
            (347, 565),
            (301, 627),
            (343, 631),
            (319, 696),
            (373, 655),
        ),
        fill=(37, 91, 38, 255),
    )
    draw.ellipse((608, 397, 645, 434), fill=(50, 93, 49, 255))
    draw.ellipse((676, 543, 710, 570), fill=(50, 93, 49, 180))


def build_emblem(unit_id: str) -> Image.Image:
    badge = draw_badge_base()
    draw = ImageDraw.Draw(badge)
    if unit_id == "infantry":
        draw_sword(draw)
    elif unit_id == "archer":
        draw_bow(draw)
    elif unit_id == "cavalry":
        draw_horse(draw)
    else:
        raise ValueError(unit_id)
    return badge.resize((BADGE_SIZE, BADGE_SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    for unit_id in UNIT_IDS:
        save_webp(
            build_normalized_sprite(unit_id),
            UNIT_DIR / f"{unit_id}-chibi-map-v3.webp",
        )
        save_webp(
            build_emblem(unit_id),
            UNIT_DIR / f"{unit_id}-emblem-v3.webp",
        )


if __name__ == "__main__":
    main()
