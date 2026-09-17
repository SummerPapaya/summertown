#!/usr/bin/env python3
"""Build the Summer Town link-card artwork.

Link previews (WeChat, iMessage, Slack, …) reject SVG, so the two design files
in assets/og/ are rasterised to the PNGs that og:image actually points at:

    assets/og/summer-town.svg  ->  public/og/summer-town.png
    assets/og/apple-album.svg  ->  public/og/apple-album.png

Both SVGs are self-contained: the captions are converted to outline paths and
the Apple Cottage artwork is embedded as a data URI. That means they render
identically anywhere — no fonts to install, no hanging references, and no
chance of a caption falling back to a system font.

Usage:  python3 scripts/build-og-cards.py

Needs Pillow + fonttools (tools only, nothing at runtime):
    pip install pillow "fonttools[woff]"
and a Chrome binary, located via $CHROME or the usual macOS/Linux paths.
"""
from __future__ import annotations

import base64
import io
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SVG_DIR = ROOT / "assets" / "og"

# The two display faces that ship with the site.
LOCAL_FONTS = {
    "zh-heading": PUBLIC / "fonts" / "GBai.woff2",          # 夏天镇 on the town card
    "zh-hand": PUBLIC / "fonts" / "JasonHandwriting2.woff2",  # 一天一苹果 / tagline
}
# Fredoka + Caveat come from Google Fonts at runtime, so they are fetched (and
# cached for the session) rather than vendored. If the fetch fails the Latin
# captions fall back to the site's own handwriting face.
WEB_FONTS = {
    "latin-round": ("https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap", "Fredoka 700"),
    "latin-hand": ("https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap", "Caveat 700"),
}

CARD_W, CARD_H = 1200, 630


# --------------------------------------------------------------------- fonts
def _download(url: str, ua: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def resolve_fonts(cache: Path) -> tuple[dict[str, Path], list[str]]:
    import re

    fonts = dict(LOCAL_FONTS)
    notes: list[str] = []
    ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

    for key, (css_url, label) in WEB_FONTS.items():
        target = cache / f"{key}.woff2"
        try:
            css = _download(css_url, ua).decode()
            blocks = re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
            latin = next((b for name, b in blocks if name == "latin"), None)
            if latin is None:
                raise LookupError("no latin subset in the Google Fonts response")
            target.write_bytes(_download(re.search(r"url\((https://[^)]+\.woff2)\)", latin).group(1), ua))
            fonts[key] = target
        except Exception as exc:  # offline, blocked, Google changed their CSS…
            notes.append(f"{label} unavailable ({exc}); falling back to the local hand face")
            fonts[key] = LOCAL_FONTS["zh-hand"]
    return fonts, notes


def outline(font_path: Path, text: str, size: float, tracking: float = 0.0):
    """Return (path_d, advance_width) for `text`, drawn at `size` px with the
    baseline on y = 0 and y already flipped for SVG."""
    font = TTFont(str(font_path))
    scale = size / font["head"].unitsPerEm
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()

    x = 0.0
    parts: list[str] = []
    for char in text:
        name = cmap.get(ord(char))
        if name is None:
            x += size * 0.5
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0)))
        if commands := pen.getCommands():
            parts.append(commands)
        x += glyphs[name].width * scale + tracking
    return " ".join(parts), (x - tracking if text else 0.0)


def at(d: str, x: float, y: float) -> str:
    return f'<path transform="translate({x:.2f} {y:.2f})" d="{d}"/>'


def centred(d: str, width: float, x: float, y: float) -> str:
    return at(d, x - width / 2, y)


# ------------------------------------------------------------------ backdrop
BACKDROP = """  <defs>
    <radialGradient id="bg" cx="50%" cy="-12%" r="132%">
      <stop offset="0" stop-color="#fffdf8"/>
      <stop offset=".42" stop-color="#fff9ef"/>
      <stop offset=".72" stop-color="#fff3df"/>
      <stop offset="1" stop-color="#f6e3c2"/>
    </radialGradient>
    <pattern id="grain" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.1" fill="#4a4470" opacity=".055"/>
      <circle cx="17" cy="15" r="1.1" fill="#ff9b9b" opacity=".07"/>
    </pattern>
    <linearGradient id="tape" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe7ae"/>
      <stop offset="1" stop-color="#ffdd94"/>
    </linearGradient>
    <linearGradient id="photoBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8eef8"/>
      <stop offset=".3" stop-color="#e7f1f4"/>
      <stop offset=".52" stop-color="#f7efd6"/>
      <stop offset=".66" stop-color="#fcecbc"/>
      <stop offset="1" stop-color="#fcecbc"/>
    </linearGradient>
    <clipPath id="photoClip"><rect x="400" y="75" width="400" height="400" rx="3"/></clipPath>
    <filter id="cardShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#4a4470" flood-opacity=".26"/>
    </filter>
    <filter id="tapeShadow" x="-60%" y="-80%" width="220%" height="260%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#4a4470" flood-opacity=".22"/>
    </filter>
  </defs>

  <!-- backdrop. Everything essential stays inside the centred 630x630 square,
       so a square (WeChat) thumbnail crop loses nothing. -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grain)"/>
  <g>
    <path d="M0 496 Q75 466 150 496 T300 496 T450 496 T600 496 T750 496 T900 496 T1050 496 T1200 496 L1200 630 L0 630 Z" fill="#cfeaf3" opacity=".6"/>
    <path d="M0 528 Q75 498 150 528 T300 528 T450 528 T600 528 T750 528 T900 528 T1050 528 T1200 528 L1200 630 L0 630 Z" fill="#a5e3d8" opacity=".56"/>
    <path d="M0 560 Q75 530 150 560 T300 560 T450 560 T600 560 T750 560 T900 560 T1050 560 T1200 560 L1200 630 L0 630 Z" fill="#7ec8e3" opacity=".48"/>
  </g>
  <g fill="#ffdd94">
    <path d="M292 166 l7 20 20 7 -20 7 -7 20 -7 -20 -20 -7 20 -7 z"/>
    <path d="M906 236 l5 15 15 5 -15 5 -5 15 -5 -15 -15 -5 15 -5 z" opacity=".75"/>
    <path d="M876 116 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 z" opacity=".55"/>
  </g>"""

HEADER = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" '
    'width="1200" height="630">\n'
)
NOTE = """  <!-- ==========================================================
       %s
       Generated by scripts/build-og-cards.py — edit that, not this.
       Captions are outlines and the artwork is embedded, so this file
       renders identically with no fonts or assets alongside it.
       ========================================================== -->
"""


# ----------------------------------------------------------------- the cards
def build_town_card(fonts: dict[str, Path]) -> str:
    logo = (PUBLIC / "logo.svg").read_text(encoding="utf-8")
    inner = logo[logo.index(">", logo.index("<svg")) + 1 : logo.rindex("</svg>")]
    inner = "\n".join("    " + line for line in inner.strip().splitlines())

    en_d, en_w = outline(fonts["latin-round"], "Summer Town", 74)
    zh_d, zh_w = outline(fonts["zh-heading"], "夏天镇", 46)
    tag_d, tag_w = outline(fonts["latin-hand"], "a tiny seaside town", 36, tracking=1.2)

    gap = 26
    en_x = CARD_W / 2 - (en_w + gap + zh_w) / 2
    zh_x = en_x + en_w + gap

    return (
        HEADER
        + NOTE % "Summer Town — the town home card (public/og/summer-town.png)"
        + BACKDROP
        + f"""

  <!-- the town mark, lifted straight out of public/logo.svg -->
  <g transform="translate(465 58) scale(1.6875)">
{inner}
  </g>

  <!-- wordmark (Fredoka 700 + GBai Marker) and tagline (Caveat), as outlines -->
  <g fill="#4a4470">{at(en_d, en_x, 402)}</g>
  <g fill="#7b74a3">{at(zh_d, zh_x, 400)}</g>
  <g fill="#b08c72">{centred(tag_d, tag_w, CARD_W / 2, 458)}</g>
</svg>
"""
    )


def build_album_card(fonts: dict[str, Path]) -> str:
    # Trim the faint "AI生成" watermark that sits under the cottage's shadow,
    # then embed what is left so the SVG needs no companion file.
    cottage = Image.open(PUBLIC / "b-apple.png").convert("RGBA").crop((16, 152, 909, 939))
    cottage = cottage.resize((600, round(cottage.height * 600 / cottage.width)), Image.LANCZOS)
    buf = io.BytesIO()
    cottage.save(buf, "PNG", optimize=True)
    uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    spr_w, spr_h = 372, 328
    spr_x = 400 + (400 - spr_w) / 2
    spr_y = 475 - 14 - spr_h

    cap1_d, cap1_w = outline(fonts["latin-hand"], "An Apple A Day", 48, tracking=1.0)
    cap2_d, cap2_w = outline(fonts["zh-hand"], "一天一苹果", 30, tracking=2.0)

    return (
        HEADER
        + NOTE % "An Apple A Day — the apple-album card (public/og/apple-album.png)"
        + BACKDROP
        + f"""

  <!-- the polaroid -->
  <g transform="rotate(-3.4 600 315)">
    <rect x="386" y="61" width="428" height="508" rx="5" fill="#ffffff" filter="url(#cardShadow)"/>

    <g clip-path="url(#photoClip)">
      <rect x="400" y="75" width="400" height="400" fill="url(#photoBg)"/>
      <g fill="#ffffff" opacity=".92">
        <path d="M448 162 a20 20 0 0 1 37 -10 a17 17 0 0 1 30 11 z"/>
        <path d="M700 218 a16 16 0 0 1 29 -8 a14 14 0 0 1 24 9 z" opacity=".85"/>
      </g>
      <!-- Apple Cottage — the building the album lives in -->
      <image href="{uri}" x="{spr_x:.1f}" y="{spr_y:.1f}" width="{spr_w}" height="{spr_h}"/>
    </g>

    <g fill="#e8563f">{centred(cap1_d, cap1_w, 600, 529)}</g>
    <g fill="#7b74a3">{centred(cap2_d, cap2_w, 600, 561)}</g>

    <g transform="rotate(4.5 600 58)">
      <rect x="541" y="44" width="118" height="28" rx="3" fill="url(#tape)" filter="url(#tapeShadow)"/>
      <rect x="541" y="44" width="118" height="9" rx="3" fill="#ffffff" opacity=".3"/>
    </g>
  </g>
</svg>
"""
    )


# --------------------------------------------------------------- rasterising
def find_chrome() -> str | None:
    if env := os.environ.get("CHROME"):
        return env
    if found := shutil.which("google-chrome") or shutil.which("chromium"):
        return found
    for candidate in (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ):
        if Path(candidate).exists():
            return candidate
    return None


def rasterise(chrome: str, svg: Path, png: Path) -> None:
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--window-size={CARD_W},{CARD_H}",
            "--virtual-time-budget=8000",
            f"--screenshot={png}",
            svg.resolve().as_uri(),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def optimise(png: Path) -> None:
    """Re-encode through Pillow: Chrome's PNG is far from tight."""
    image = Image.open(png).convert("RGB")
    if image.size != (CARD_W, CARD_H):
        image = image.crop((0, 0, CARD_W, CARD_H))
    image.save(png, "PNG", optimize=True)


def main() -> int:
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "og").mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        cache = Path(tmp)
        fonts, notes = resolve_fonts(cache)
        for note in notes:
            print(f"  ! {note}")

        cards = {
            "summer-town": build_town_card(fonts),
            "apple-album": build_album_card(fonts),
        }
        for name, svg in cards.items():
            target = SVG_DIR / f"{name}.svg"
            target.write_text(svg, encoding="utf-8")
            print(f"  {target.relative_to(ROOT)}  {target.stat().st_size / 1024:.0f} KB")

        chrome = find_chrome()
        if chrome is None:
            print("  ! no Chrome found — set $CHROME to also rasterise the PNGs")
            return 0

        for name in cards:
            svg = (SVG_DIR / f"{name}.svg").resolve()
            png = PUBLIC / "og" / f"{name}.png"
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
                raw = Path(handle.name)
            try:
                rasterise(chrome, svg, raw)
                shutil.move(str(raw), png)
                optimise(png)
            finally:
                raw.unlink(missing_ok=True)
            print(f"  {png.relative_to(ROOT)}  {png.stat().st_size / 1024:.0f} KB")

    return 0


if __name__ == "__main__":
    sys.exit(main())
