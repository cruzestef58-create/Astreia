# -*- coding: utf-8 -*-
"""Prepare le logo pour l'embarquer : detoure le fond blanc, recadre, reduit."""
import base64, io, pathlib
from collections import deque

SOURCES = ("logo.png", "logo.jpg", "logo.jpeg", "logo.webp")
LARGEUR_MAX = 560
DUR, DOUX = 10, 46          # distance au blanc : <DUR => transparent, >DOUX => opaque

def _dist_blanc(px):
    r, g, b = px[0], px[1], px[2]
    return max(255 - r, 255 - g, 255 - b)

def preparer(dossier: pathlib.Path):
    src = next((dossier / n for n in SOURCES if (dossier / n).exists()), None)
    if src is None:
        return None, "aucun logo.png trouvé — repli typographique"
    from PIL import Image
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    # 1) remplissage par diffusion depuis les 4 coins : seul le fond contigu part
    vus = bytearray(w * h)
    fil = deque()
    for c in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if _dist_blanc(px[c]) <= DOUX:
            fil.append(c); vus[c[1] * w + c[0]] = 1
    while fil:
        x, y = fil.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vus[ny * w + nx]:
                if _dist_blanc(px[nx, ny]) <= DOUX:
                    vus[ny * w + nx] = 1; fil.append((nx, ny))

    # 2) alpha progressif : blanc pur -> 0, franges -> partiel
    for y in range(h):
        base = y * w
        for x in range(w):
            if not vus[base + x]:
                continue
            r, g, b, a = px[x, y]
            d = _dist_blanc((r, g, b))
            px[x, y] = (r, g, b, 0 if d <= DUR else int(min(1.0, (d - DUR) / (DOUX - DUR)) * a))

    im = im.crop(im.getbbox() or (0, 0, w, h))
    if im.width > LARGEUR_MAX:
        im = im.resize((LARGEUR_MAX, round(im.height * LARGEUR_MAX / im.width)), Image.LANCZOS)

    # WebP avec alpha : ~6x plus leger que le PNG, et le gabarit embarque une 2e copie
    mime, data = "image/webp", None
    try:
        buf = io.BytesIO(); im.save(buf, "WEBP", quality=86, method=6); data = buf.getvalue()
    except Exception:
        mime = None
    if data is None or len(data) > 400_000:
        buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
        mime, data = "image/png", buf.getvalue()
    im.save(dossier / "_logo-apercu.png")     # controle visuel du detourage
    uri = f"data:{mime};base64," + base64.b64encode(data).decode("ascii")
    return uri, f"{src.name} → {im.width}×{im.height} {mime.split('/')[1]}, {len(data):,} octets embarqués"

if __name__ == "__main__":
    uri, note = preparer(pathlib.Path(__file__).parent)
    print(note)
