import json
import urllib.request
from pathlib import Path

STATIC = Path(__file__).resolve().parent.parent / "static"
DOSSIER = STATIC / "logos"
DOSSIER.mkdir(exist_ok=True)

for p in json.loads((STATIC / "presets.json").read_text(encoding="utf-8")):
    url = f"https://cdn.simpleicons.org/{p['slug']}/{p['couleur']}"
    cible = DOSSIER / f"{p['slug']}.svg"
    try:
        requete = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        cible.write_bytes(urllib.request.urlopen(requete, timeout=10).read())
        print("ok    ", p["slug"])
    except Exception as e:
        print("échec ", p["slug"], e)