import sqlite3
from contextlib import contextmanager
from decimal import Decimal
from pathlib import Path

from platformdirs import user_data_dir

from app.models import Abonnement, AbonnementDB, Frequence

DB_PATH = Path(user_data_dir("suivi-abonnements")) / "abonnements.db"


@contextmanager
def connexion():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connexion() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS abonnements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                prix TEXT NOT NULL,
                frequence TEXT NOT NULL,
                categorie TEXT,
                icone TEXT
            )"""
        )
        # Migration : ajoute la colonne icone aux bases créées avant cette version
        colonnes = [c["name"] for c in conn.execute("PRAGMA table_info(abonnements)")]
        if "icone" not in colonnes:
            conn.execute("ALTER TABLE abonnements ADD COLUMN icone TEXT")


def _vers_modele(ligne: sqlite3.Row) -> AbonnementDB:
    return AbonnementDB(
        id=ligne["id"],
        nom=ligne["nom"],
        prix=Decimal(ligne["prix"]),
        frequence=Frequence(ligne["frequence"]),
        categorie=ligne["categorie"],
        icone=ligne["icone"],
    )


def lister() -> list[AbonnementDB]:
    with connexion() as conn:
        lignes = conn.execute(
            "SELECT * FROM abonnements ORDER BY nom COLLATE NOCASE"
        ).fetchall()
    return [_vers_modele(ligne) for ligne in lignes]


def ajouter(abo: Abonnement) -> AbonnementDB:
    with connexion() as conn:
        cur = conn.execute(
            "INSERT INTO abonnements (nom, prix, frequence, categorie, icone) VALUES (?, ?, ?, ?, ?)",
            (abo.nom, str(abo.prix), abo.frequence.value, abo.categorie, abo.icone),
        )
        id_ = cur.lastrowid
    return AbonnementDB(id=id_, **abo.model_dump())


def modifier(id_: int, abo: Abonnement) -> AbonnementDB | None:
    with connexion() as conn:
        cur = conn.execute(
            "UPDATE abonnements SET nom = ?, prix = ?, frequence = ?, categorie = ?, icone = ? WHERE id = ?",
            (abo.nom, str(abo.prix), abo.frequence.value, abo.categorie, abo.icone, id_),
        )
        if cur.rowcount == 0:
            return None
    return AbonnementDB(id=id_, **abo.model_dump())


def supprimer(id_: int) -> bool:
    with connexion() as conn:
        cur = conn.execute("DELETE FROM abonnements WHERE id = ?", (id_,))
        return cur.rowcount > 0