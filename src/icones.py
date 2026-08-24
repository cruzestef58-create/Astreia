# -*- coding: utf-8 -*-
"""Icônes d'application, dérivées du logo détouré."""
import pathlib
import logo as _logo

FOND = (11, 16, 32)          # nuit d'Astréïa, comme le thème sombre

def _base(dossier):
    from PIL import Image
    src = dossier / "logo.png"
    if not src.exists():
        return None
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    from collections import deque
    vus = bytearray(w * h); fil = deque()
    for c in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if _logo._dist_blanc(px[c]) <= _logo.DOUX:
            fil.append(c); vus[c[1] * w + c[0]] = 1
    while fil:
        x, y = fil.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vus[ny * w + nx] and _logo._dist_blanc(px[nx, ny]) <= _logo.DOUX:
                vus[ny * w + nx] = 1; fil.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if vus[y * w + x]:
                r, g, b, a = px[x, y]
                d = _logo._dist_blanc((r, g, b))
                px[x, y] = (r, g, b, 0 if d <= _logo.DUR else int(min(1.0, (d - _logo.DUR) / (_logo.DOUX - _logo.DUR)) * a))
    return im.crop(im.getbbox() or (0, 0, w, h))

def _poser(logo_im, taille, part):
    """Logo centré sur le fond nuit ; `part` = fraction occupée (zone sûre)."""
    from PIL import Image
    fond = Image.new("RGBA", (taille, taille), FOND + (255,))
    lw = int(taille * part)
    lh = max(1, round(logo_im.height * lw / logo_im.width))
    if lh > taille * part:
        lh = int(taille * part); lw = max(1, round(logo_im.width * lh / logo_im.height))
    petit = logo_im.resize((lw, lh), Image.LANCZOS)
    fond.alpha_composite(petit, ((taille - lw) // 2, (taille - lh) // 2))
    return fond

def generer(src_dir: pathlib.Path, dest: pathlib.Path):
    im = _base(src_dir)
    if im is None:
        return "aucun logo.png : icônes non générées"
    dest.mkdir(parents=True, exist_ok=True)
    faits = []
    for taille, nom, part in ((192, "192.png", .92), (512, "512.png", .92),
                              (512, "512-masque.png", .66), (180, "apple-180.png", .88),
                              (32, "32.png", .96)):
        _poser(im, taille, part).convert("RGB").save(dest / nom, "PNG", optimize=True)
        faits.append(nom)
    return "icônes : " + ", ".join(faits)

if __name__ == "__main__":
    d = pathlib.Path(__file__).parent
    print(generer(d, d.parent / "public" / "icones"))
