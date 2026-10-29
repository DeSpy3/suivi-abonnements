# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
"""Génère l'icône de l'appli (SVG, PNG et ICO) sans dépendance externe.

Usage : python scripts/generer_icones.py
"""
import math
import struct
import zlib
from pathlib import Path

STATIC = Path(__file__).resolve().parent.parent / "static"

FOND = (0x1A, 0x18, 0x20)
# Parts du donut : (fraction, couleur), dans le sens des aiguilles d'une montre depuis midi
PARTS = [(0.55, (0x8B, 0x5C, 0xF6)), (0.30, (0x3B, 0x82, 0xF6)), (0.15, (0xF0, 0x8A, 0x4B))]
RAYON_EXT, RAYON_INT, ARRONDI = 0.36, 0.20, 0.22  # en fraction de la taille


def hexa(c):
    return "#%02x%02x%02x" % c


def svg() -> str:
    # Arcs dessinés avec stroke-dasharray sur un cercle de circonférence 100
    rayon = (RAYON_EXT + RAYON_INT) / 2 * 64
    epaisseur = (RAYON_EXT - RAYON_INT) * 64
    perimetre = 2 * math.pi * rayon
    arcs, cumul = [], 0.0
    for fraction, couleur in PARTS:
        longueur = fraction * perimetre
        arcs.append(
            f'<circle cx="32" cy="32" r="{rayon:.2f}" fill="none" stroke="{hexa(couleur)}" '
            f'stroke-width="{epaisseur:.2f}" stroke-dasharray="{longueur:.2f} {perimetre:.2f}" '
            f'stroke-dashoffset="{-cumul:.2f}" transform="rotate(-90 32 32)"/>'
        )
        cumul += longueur
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect width="64" height="64" rx="{ARRONDI * 64:.1f}" fill="{hexa(FOND)}"/>'
        + "".join(arcs) + "</svg>\n"
    )


def couleur_pixel(x: float, y: float):
    """Couleur (r, g, b, a) au point (x, y) dans [0, 1]², ou None si transparent."""
    # Carré aux coins arrondis
    dx = max(abs(x - 0.5) - (0.5 - ARRONDI), 0)
    dy = max(abs(y - 0.5) - (0.5 - ARRONDI), 0)
    if dx * dx + dy * dy > ARRONDI * ARRONDI:
        return None
    distance = math.hypot(x - 0.5, y - 0.5)
    if RAYON_INT <= distance <= RAYON_EXT:
        angle = (math.atan2(x - 0.5, -(y - 0.5)) / (2 * math.pi)) % 1  # 0 à midi, sens horaire
        cumul = 0.0
        for fraction, couleur in PARTS:
            cumul += fraction
            if angle <= cumul:
                return couleur
    return FOND


def png(taille: int) -> bytes:
    ss = 4  # sur-échantillonnage pour des bords lisses
    lignes = bytearray()
    for py in range(taille):
        lignes.append(0)  # filtre PNG « aucun »
        for px in range(taille):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    c = couleur_pixel((px + (sx + 0.5) / ss) / taille, (py + (sy + 0.5) / ss) / taille)
                    if c:
                        r, g, b, a = r + c[0], g + c[1], b + c[2], a + 1
            n = ss * ss
            lignes += bytes((r // a, g // a, b // a, 255 * a // n)) if a else b"\0\0\0\0"

    def bloc(type_, donnees):
        return struct.pack(">I", len(donnees)) + type_ + donnees + struct.pack(">I", zlib.crc32(type_ + donnees))

    entete = struct.pack(">IIBBBBB", taille, taille, 8, 6, 0, 0, 0)  # RGBA 8 bits
    return b"\x89PNG\r\n\x1a\n" + bloc(b"IHDR", entete) + bloc(b"IDAT", zlib.compress(bytes(lignes), 9)) + bloc(b"IEND", b"")


def ico(images: dict[int, bytes]) -> bytes:
    """Fichier .ico contenant des images PNG (format accepté depuis Windows Vista)."""
    entete = struct.pack("<HHH", 0, 1, len(images))
    repertoire, donnees = b"", b""
    decalage = 6 + 16 * len(images)
    for taille, image in images.items():
        cote = 0 if taille >= 256 else taille  # 0 signifie 256 dans le format ICO
        repertoire += struct.pack("<BBBBHHII", cote, cote, 0, 0, 1, 32, len(image), decalage + len(donnees))
        donnees += image
    return entete + repertoire + donnees


if __name__ == "__main__":
    (STATIC / "icone.svg").write_text(svg(), encoding="utf-8")
    grande = png(256)
    (STATIC / "icone.png").write_bytes(grande)
    (STATIC / "icone.ico").write_bytes(ico({256: grande, 48: png(48), 32: png(32), 16: png(16)}))
    print("Icônes écrites dans", STATIC)
