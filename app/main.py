from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles

from app import database
from app.logic import cout_mensuel, total_mensuel
from app.models import Abonnement, AbonnementDB, AbonnementOut

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Suivi d'abonnements", lifespan=lifespan)


def vers_sortie(abo: AbonnementDB) -> AbonnementOut:
    return AbonnementOut(**abo.model_dump(), cout_mensuel=round(cout_mensuel(abo), 2))


@app.get("/api/abonnements")
def liste() -> list[AbonnementOut]:
    return [vers_sortie(a) for a in database.lister()]


@app.post("/api/abonnements", status_code=201)
def creer(abo: Abonnement) -> AbonnementOut:
    return vers_sortie(database.ajouter(abo))


@app.put("/api/abonnements/{id_}")
def mettre_a_jour(id_: int, abo: Abonnement) -> AbonnementOut:
    resultat = database.modifier(id_, abo)
    if resultat is None:
        raise HTTPException(status_code=404, detail="Abonnement introuvable")
    return vers_sortie(resultat)


@app.delete("/api/abonnements/{id_}", status_code=204)
def supprimer(id_: int) -> Response:
    if not database.supprimer(id_):
        raise HTTPException(status_code=404, detail="Abonnement introuvable")
    return Response(status_code=204)


@app.get("/api/total")
def total() -> dict:
    abos = database.lister()
    mensuel = total_mensuel(abos)

    par_categorie: dict[str, Decimal] = {}
    for a in abos:
        cle = a.categorie or "Sans catégorie"
        par_categorie[cle] = par_categorie.get(cle, Decimal("0")) + cout_mensuel(a)

    return {
        "mensuel": str(round(mensuel, 2)),
        "annuel": str(round(mensuel * 12, 2)),
        "nombre": len(abos),
        "par_categorie": {
            k: str(round(v, 2))
            for k, v in sorted(par_categorie.items(), key=lambda kv: kv[1], reverse=True)
        },
    }


# Doit rester en dernier : sert l'interface sur "/"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")