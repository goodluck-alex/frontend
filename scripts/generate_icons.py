from pathlib import Path

from PIL import Image


ROOT = Path(r"d:\gtn")
FRONTEND_PUBLIC = ROOT / "frontend" / "public"
ASSETS = ROOT / "assets"

SRC_APP_ICON = ASSETS / "file_00000000778471fd9134aa09563c4c3b-removebg-preview.png"
SRC_LOGO = ASSETS / "file_000000005f88722f940c445010ce0591-removebg-preview (1).png"


def remove_black_background(image: Image.Image, threshold: int = 28) -> Image.Image:
    rgba = image.convert("RGBA")
    out = Image.new("RGBA", rgba.size)
    src = rgba.getdata()
    pixels = []
    for r, g, b, a in src:
        if r < threshold and g < threshold and b < threshold:
            pixels.append((0, 0, 0, 0))
        else:
            pixels.append((r, g, b, a))
    out.putdata(pixels)
    return out


def trim_transparent(image: Image.Image, pad: int = 8) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(image.width, right + pad)
    bottom = min(image.height, bottom + pad)
    return image.crop((left, top, right, bottom))


def fit_square(image: Image.Image, size: int, pad_ratio: float = 0.13) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    usable = int(size * (1 - 2 * pad_ratio))
    src = image.copy()
    src.thumbnail((usable, usable), Image.Resampling.LANCZOS)
    x = (size - src.width) // 2
    y = (size - src.height) // 2
    canvas.paste(src, (x, y), src)
    return canvas


def main() -> None:
    FRONTEND_PUBLIC.mkdir(parents=True, exist_ok=True)

    app_icon = trim_transparent(remove_black_background(Image.open(SRC_APP_ICON)))
    logo = trim_transparent(remove_black_background(Image.open(SRC_LOGO)))

    # Primary brand images used across pages and metadata.
    logo_1200 = Image.new("RGBA", (1200, 630), (255, 255, 255, 255))
    fitted_logo = logo.copy()
    fitted_logo.thumbnail((980, 430), Image.Resampling.LANCZOS)
    lx = (1200 - fitted_logo.width) // 2
    ly = (630 - fitted_logo.height) // 2
    logo_1200.paste(fitted_logo, (lx, ly), fitted_logo)
    logo_1200.save(FRONTEND_PUBLIC / "gtn-logo.png")

    header_logo = fit_square(app_icon, 256, pad_ratio=0.08)
    header_logo.save(FRONTEND_PUBLIC / "gtn-header-logo.png")

    # Favicon and platform icons.
    icon_512 = fit_square(app_icon, 512, pad_ratio=0.08)
    icon_192 = fit_square(app_icon, 192, pad_ratio=0.08)
    icon_180 = fit_square(app_icon, 180, pad_ratio=0.08)
    icon_32 = fit_square(app_icon, 32, pad_ratio=0.05)
    icon_16 = fit_square(app_icon, 16, pad_ratio=0.05)

    icon_512.save(FRONTEND_PUBLIC / "icon-512.png")
    icon_192.save(FRONTEND_PUBLIC / "icon-192.png")
    icon_180.save(FRONTEND_PUBLIC / "apple-touch-icon.png")
    icon_32.save(FRONTEND_PUBLIC / "favicon-32x32.png")
    icon_16.save(FRONTEND_PUBLIC / "favicon-16x16.png")

    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    icon_512.save(FRONTEND_PUBLIC / "favicon.ico", format="ICO", sizes=ico_sizes)

    print("Generated GTN icons in", FRONTEND_PUBLIC)


if __name__ == "__main__":
    main()
