import sqlite3
from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from pathlib import Path

from platformdirs import user_data_dir

from app.models import (
    Abonnement,
    AbonnementDB,
    Depense,
    DepenseDB,
    Frequence,
    TypeRecurrent,
)

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
                icone TEXT,
                date_prelevement TEXT
            )"""
        )
        conn.execute("CREATE TABLE IF NOT EXISTS reglages (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL)")
        conn.execute("CREATE TABLE IF NOT EXISTS budgets (categorie TEXT PRIMARY KEY, montant TEXT NOT NULL)")
        conn.execute(
            """CREATE TABLE IF NOT EXISTS depenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                libelle TEXT NOT NULL,
                montant TEXT NOT NULL,
                categorie TEXT,
                date TEXT NOT NULL
            )"""
        )
        # Migrations pour les bases créées avant cette version
        colonnes = [c["name"] for c in conn.execute("PRAGMA table_info(abonnements)")]
        for colonne in ("icone", "date_prelevement"):
            if colonne not in colonnes:
                conn.execute(f"ALTER TABLE abonnements ADD COLUMN {colonne} TEXT")
        if "type" not in colonnes:
            # Les lignes existantes deviennent des abonnements, comme avant
            conn.execute("ALTER TABLE abonnements ADD COLUMN type TEXT NOT NULL DEFAULT 'abonnement'")
        colonnes = [c["name"] for c in conn.execute("PRAGMA table_info(depenses)")]
        if "remboursement" not in colonnes:
            # Les lignes existantes restent des dépenses
            conn.execute("ALTER TABLE depenses ADD COLUMN remboursement INTEGER NOT NULL DEFAULT 0")


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def _vers_modele(ligne: sqlite3.Row) -> AbonnementDB:
    return AbonnementDB(
        id=ligne["id"],
        nom=ligne["nom"],
        prix=Decimal(ligne["prix"]),
        frequence=Frequence(ligne["frequence"]),
        categorie=ligne["categorie"],
        icone=ligne["icone"],
        date_prelevement=ligne["date_prelevement"],
        type=TypeRecurrent(ligne["type"]),
    )


def lister() -> list[AbonnementDB]:
    with connexion() as conn:
        lignes = conn.execute("SELECT * FROM abonnements ORDER BY nom COLLATE NOCASE").fetchall()
    return [_vers_modele(ligne) for ligne in lignes]


def ajouter(abo: Abonnement) -> AbonnementDB:
    with connexion() as conn:
        cur = conn.execute(
            "INSERT INTO abonnements (nom, prix, frequence, categorie, icone, date_prelevement, type) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (abo.nom, str(abo.prix), abo.frequence.value, abo.categorie, abo.icone,
             _iso(abo.date_prelevement), abo.type.value),
        )
        id_ = cur.lastrowid
    return AbonnementDB(id=id_, **abo.model_dump())


def modifier(id_: int, abo: Abonnement) -> AbonnementDB | None:
    with connexion() as conn:
        cur = conn.execute(
            "UPDATE abonnements SET nom = ?, prix = ?, frequence = ?, categorie = ?, icone = ?, "
            "date_prelevement = ?, type = ? WHERE id = ?",
            (abo.nom, str(abo.prix), abo.frequence.value, abo.categorie, abo.icone,
             _iso(abo.date_prelevement), abo.type.value, id_),
        )
        if cur.rowcount == 0:
            return None
    return AbonnementDB(id=id_, **abo.model_dump())


def supprimer(id_: int) -> bool:
    with connexion() as conn:
        cur = conn.execute("DELETE FROM abonnements WHERE id = ?", (id_,))
        return cur.rowcount > 0


# ---------- Dépenses ponctuelles ----------
def _vers_depense(ligne: sqlite3.Row) -> DepenseDB:
    return DepenseDB(
        id=ligne["id"],
        libelle=ligne["libelle"],
        montant=Decimal(ligne["montant"]),
        categorie=ligne["categorie"],
        date=ligne["date"],
        remboursement=bool(ligne["remboursement"]),
    )


def lister_depenses(debut: date, fin: date) -> list[DepenseDB]:
    """Dépenses entre debut et fin (inclus), les plus récentes d'abord."""
    with connexion() as conn:
        lignes = conn.execute(
            "SELECT * FROM depenses WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC",
            (debut.isoformat(), fin.isoformat()),
        ).fetchall()
    return [_vers_depense(ligne) for ligne in lignes]


def ajouter_depense(dep: Depense) -> DepenseDB:
    with connexion() as conn:
        cur = conn.execute(
            "INSERT INTO depenses (libelle, montant, categorie, date, remboursement) VALUES (?, ?, ?, ?, ?)",
            (dep.libelle, str(dep.montant), dep.categorie, dep.date.isoformat(), int(dep.remboursement)),
        )
        id_ = cur.lastrowid
    return DepenseDB(id=id_, **dep.model_dump())


def modifier_depense(id_: int, dep: Depense) -> DepenseDB | None:
    with connexion() as conn:
        cur = conn.execute(
            "UPDATE depenses SET libelle = ?, montant = ?, categorie = ?, date = ?, remboursement = ? WHERE id = ?",
            (dep.libelle, str(dep.montant), dep.categorie, dep.date.isoformat(), int(dep.remboursement), id_),
        )
        if cur.rowcount == 0:
            return None
    return DepenseDB(id=id_, **dep.model_dump())


def supprimer_depense(id_: int) -> bool:
    with connexion() as conn:
        cur = conn.execute("DELETE FROM depenses WHERE id = ?", (id_,))
        return cur.rowcount > 0


# ---------- Budgets ----------
def lire_budget() -> Decimal | None:
    with connexion() as conn:
        ligne = conn.execute("SELECT valeur FROM reglages WHERE cle = 'budget_mensuel'").fetchone()
    return Decimal(ligne["valeur"]) if ligne else None


def ecrire_budget(montant: Decimal | None) -> None:
    with connexion() as conn:
        if montant is None:
            conn.execute("DELETE FROM reglages WHERE cle = 'budget_mensuel'")
        else:
            conn.execute(
                "INSERT INTO reglages (cle, valeur) VALUES ('budget_mensuel', ?) "
                "ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur",
                (str(montant),),
            )


def lire_budgets_categories() -> dict[str, Decimal]:
    with connexion() as conn:
        lignes = conn.execute("SELECT categorie, montant FROM budgets").fetchall()
    return {ligne["categorie"]: Decimal(ligne["montant"]) for ligne in lignes}


def ecrire_budget_categorie(categorie: str, montant: Decimal | None) -> None:
    with connexion() as conn:
        if montant is None:
            conn.execute("DELETE FROM budgets WHERE categorie = ?", (categorie,))
        else:
            conn.execute(
                "INSERT INTO budgets (categorie, montant) VALUES (?, ?) "
                "ON CONFLICT(categorie) DO UPDATE SET montant = excluded.montant",
                (categorie, str(montant)),
            )