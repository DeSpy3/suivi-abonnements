import json
import urllib.request
from pathlib import Path

STATIC = Path(__file__).resolve().parent.parent / "static"
DOSSIER = STATIC / "logos"
DOSSIER.mkdir(exist_ok=True)

# Certaines marques ont été retirées de Simple Icons : on se rabat sur une ancienne version
ANCIENNE_VERSION = "https://cdn.jsdelivr.net/npm/simple-icons@9.21.0/icons/{slug}.svg"


def telecharger(url: str) -> bytes:
    requete = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(requete, timeout=10).read()


for p in json.loads((STATIC / "presets.json").read_text(encoding="utf-8")):
    if p.get("logo") is False:
        continue  # pas de logo libre : l'appli affiche une pastille colorée
    cible = DOSSIER / f"{p['slug']}.svg"
    try:
        cible.write_bytes(telecharger(f"https://cdn.simpleicons.org/{p['slug']}/{p['couleur']}"))
        print("ok    ", p["slug"])
    except Exception:
        try:
            svg = telecharger(ANCIENNE_VERSION.format(slug=p["slug"])).decode("utf-8")
            # Les fichiers du paquet n'ont pas de couleur : on l'ajoute sur la balise <svg>
            cible.write_text(svg.replace("<svg ", f'<svg fill="#{p["couleur"]}" ', 1), encoding="utf-8")
            print("ancien", p["slug"])
        except Exception as e:
            print("échec ", p["slug"], e)
