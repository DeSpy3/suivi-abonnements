from decimal import Decimal

from fastapi import FastAPI

from app.logic import total_mensuel
from app.models import Abonnement, Frequence

app = FastAPI(title="Suivi d'abonnements")

# Données en dur pour l'instant, on les remplacera par SQLite
ABONNEMENTS = [
    Abonnement(nom="Netflix", prix=Decimal("13.99"), frequence=Frequence.MENSUEL, categorie="Streaming"),
    Abonnement(nom="Spotify", prix=Decimal("10.99"), frequence=Frequence.MENSUEL, categorie="Musique"),
    Abonnement(nom="Nom de domaine", prix=Decimal("120"), frequence=Frequence.ANNUEL, categorie="Web"),
    Abonnement(nom="Assurance téléphone", prix=Decimal("30"), frequence=Frequence.TRIMESTRIEL),
]


@app.get("/abonnements")
def liste_abonnements() -> list[Abonnement]:
    return ABONNEMENTS


@app.get("/total")
def total() -> dict:
    return {"total_mensuel": round(total_mensuel(ABONNEMENTS), 2)}