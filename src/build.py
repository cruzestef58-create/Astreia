#!/usr/bin/env python3
"""Assemble astreia.html depuis src.html.

La page doit pouvoir se republier elle-meme (capacite `artifact`), donc elle
embarque une copie de son propre gabarit complet. On remplace :
  %%CAMPAIGN%% -> l'etat de campagne initial (JSON)
  %%TPL%%      -> le gabarit document complet, en litteral JS
"""
import json, re, sys, pathlib
# Windows : la console est en cp1252 et les fleches/accents des messages la font
# planter. On force la sortie en UTF-8 quand c'est possible.
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
import logo as _logo

HERE = pathlib.Path(__file__).parent
src  = (HERE/"src.html").read_text(encoding="utf-8")

head = re.search(r"<!--HEAD-->\n(.*?)\n<!--/HEAD-->", src, re.S).group(1)
body = re.search(r"<!--BODY-->\n(.*?)\n<!--/BODY-->", src, re.S).group(1)

# fragment : ce qu'attend l'outil Artifact (il l'enveloppe lui-meme)
fragment = head + "\n" + body

# document complet : ce que la page publiera d'elle-meme
DOC = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
       + head +
       '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')

def js_literal(s: str) -> str:
    """Litteral JS sur une ligne. `</` est echappe pour ne pas fermer <script>."""
    return json.dumps(s, ensure_ascii=False).replace("</", "<\\/")

CAMPAGNE_INITIALE = json.loads((HERE/"campagne.json").read_text(encoding="utf-8"))
LOGO_URI, LOGO_NOTE = _logo.preparer(HERE)

def campaign_literal(c) -> str:
    return json.dumps(c, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

fragment = fragment.replace("%%LOGO%%", LOGO_URI or "")
DOC      = DOC.replace("%%LOGO%%", LOGO_URI or "")

# entete PWA : uniquement sur la version hebergee (dans un artifact ces URL n'existent pas)
PWA_HEAD = (
    '<link rel="manifest" href="/manifest.json">\n'
    '<meta name="theme-color" content="#0B1020">\n'
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-title" content="Astr\u00e9\u00efa">\n'
    '<link rel="apple-touch-icon" href="/icones/apple-180.png">\n'
    '<link rel="icon" type="image/png" href="/icones/32.png">'
)
fragment = fragment.replace("%%PWAHEAD%%", "")
DOC_ART  = DOC.replace("%%PWAHEAD%%", "")          # artifact : pas de manifeste, ces URL n'y existent pas
DOC_LIVE = DOC.replace("%%PWAHEAD%%", PWA_HEAD)    # site hebergé : installable

for name, txt in (("fragment", fragment), ("document", DOC_ART), ("live", DOC_LIVE)):
    for ph in ("%%CAMPAIGN%%", "%%TPL%%", "%%CIBLE%%"):
        if txt.count(ph) != 1:
            sys.exit(f"ERREUR: {name} contient {txt.count(ph)} fois {ph} (attendu 1)")

# --- cible « artifact » : fragment auto-republiable ---
out = (fragment
       .replace("%%CIBLE%%", "artifact")
       .replace("%%CAMPAIGN%%", campaign_literal(CAMPAGNE_INITIALE))
       .replace("%%TPL%%", js_literal(DOC_ART.replace("%%CIBLE%%", "artifact"))))
(HERE/"astreia.html").write_text(out, encoding="utf-8")

# --- cible « live » : document complet servi par Cloudflare ---
live = (DOC_LIVE.replace("%%CIBLE%%", "live")
           .replace("%%CAMPAIGN%%", campaign_literal(CAMPAGNE_INITIALE))
           .replace("%%TPL%%", '""'))
import os
pub = pathlib.Path(os.path.expanduser("~/Documents/astreia-live/public"))
pub.mkdir(parents=True, exist_ok=True)
(pub/"index.html").write_text(live, encoding="utf-8")

import shutil, icones
for f in ("manifest.json", "sw.js"):
    shutil.copyfile(HERE/f, pub/f)
print(icones.generer(HERE, pub/"icones"))
print(f"live         : {pub/'index.html'} ({len(live):,} octets)")
print(f"logo         : {LOGO_NOTE}")
print(f"astreia.html : {len(out):,} octets  (gabarit {len(DOC):,})")
