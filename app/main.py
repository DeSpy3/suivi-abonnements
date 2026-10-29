from contextlib import asynccontextmanager
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles

from app import database
from app.logic import (
    ajouter_mois,
    bornes_du_mois,
    cout_mensuel,
    cout_par_categorie,
    depenses_par_categorie,
    echeances,
    prelevements_du_mois,
    signe,
    total_aides,
    total_depenses,
    total_mensuel,
)
from app.models import (
    Abonnement,
    AbonnementDB,
    AbonnementOut,
    BudgetCategorieIn,
    BudgetIn,
    Depense,
    DepenseDB,
    TypeRecurrent,
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Mon budget", lifespan=lifespan)


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


@app.get("/api/depenses")
def liste_depenses(mois: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$")) -> dict:
    """Dépenses ponctuelles d'un mois (AAAA-MM), le mois courant par défaut."""
    try:
        jour = date.fromisoformat(mois + "-01") if mois else date.today()
    except ValueError:
        raise HTTPException(status_code=422, detail="Mois invalide") from None
    debut, fin = bornes_du_mois(jour)
    depenses = database.lister_depenses(debut, fin)
    par_categorie = depenses_par_categorie(depenses)
    return {
        "mois": debut.isoformat()[:7],
        "depenses": depenses,
        "total": str(total_depenses(depenses)),
        "categories": [
            {"nom": nom, "montant": str(montant)}
            for nom, montant in sorted(par_categorie.items(), key=lambda c: c[1], reverse=True)
        ],
    }


@app.post("/api/depenses", status_code=201)
def creer_depense(dep: Depense) -> DepenseDB:
    return database.ajouter_depense(dep)


@app.put("/api/depenses/{id_}")
def mettre_a_jour_depense(id_: int, dep: Depense) -> DepenseDB:
    resultat = database.modifier_depense(id_, dep)
    if resultat is None:
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    return resultat


@app.delete("/api/depenses/{id_}", status_code=204)
def supprimer_depense(id_: int) -> Response:
    if not database.supprimer_depense(id_):
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    return Response(status_code=204)


@app.put("/api/budget", status_code=204)
def definir_budget(corps: BudgetIn) -> Response:
    database.ecrire_budget(corps.montant)
    return Response(status_code=204)


@app.put("/api/budgets", status_code=204)
def definir_budget_categorie(corps: BudgetCategorieIn) -> Response:
    database.ecrire_budget_categorie(corps.categorie, corps.montant)
    return Response(status_code=204)


@app.get("/api/synthese")
def synthese() -> dict:
    abos = database.lister()
    aujourdhui = date.today()
    ponctuelles = database.lister_depenses(*bornes_du_mois(aujourdhui))
    # Brut = dépenses seules ; les aides et remboursements viennent ensuite en déduction
    recurrent = total_mensuel([a for a in abos if signe(a) > 0])
    ponctuel = total_depenses([d for d in ponctuelles if signe(d) > 0])
    aides = total_aides(abos, ponctuelles)
    brut = recurrent + ponctuel
    mensuel = brut - aides
    budget = database.lire_budget()
    budgets = database.lire_budgets_categories()

    # Par catégorie, en net : coût mensuel lissé des récurrentes + dépenses ponctuelles du mois
    depenses = depenses_par_categorie(ponctuelles)
    for nom, montant in cout_par_categorie(abos).items():
        depenses[nom] = depenses.get(nom, Decimal("0")) + montant

    # Grandes zones pour le donut de la vue d'ensemble (dépenses brutes : un donut n'a pas de part négative)
    seuls_abos = [a for a in abos if a.type == TypeRecurrent.ABONNEMENT]
    total_abos = total_mensuel(seuls_abos)
    zones = [
        {"nom": nom, "montant": str(round(montant, 2)),
         "pourcentage": float(montant / brut * 100) if brut else 0}
        for nom, montant in [
            ("Abonnements", total_abos),
            ("Charges fixes", recurrent - total_abos),
            ("Dépenses ponctuelles", ponctuel),
        ]
    ]

    # Détail des abonnements seuls, pour le donut de l'onglet Abonnements
    categories_abonnements = [
        {"nom": nom, "montant": str(round(montant, 2)),
         "pourcentage": float(montant / total_abos * 100) if total_abos else 0}
        for nom, montant in sorted(cout_par_categorie(seuls_abos).items(), key=lambda x: x[1], reverse=True)
    ]

    categories = []
    for nom in sorted(set(depenses) | set(budgets), key=lambda n: depenses.get(n, Decimal("0")), reverse=True):
        montant = depenses.get(nom, Decimal("0"))
        categories.append({
            "nom": nom,
            "montant": str(round(montant, 2)),
            "pourcentage": max(float(montant / brut * 100), 0) if brut else 0,
            "budget": str(budgets[nom]) if nom in budgets else None,
        })

    # Argent réellement prélevé, aides déduites, mois par mois (mois courant + 5 suivants).
    # Les dépenses ponctuelles ne sont connues que pour le mois courant.
    premier = aujourdhui.replace(day=1)
    projection = []
    for i in range(6):
        debut = ajouter_mois(premier, i)
        fin = ajouter_mois(premier, i + 1) - timedelta(days=1)
        total_mois = sum((prelevements_du_mois(a, debut, fin) for a in abos), Decimal("0"))
        if i == 0:
            total_mois += total_depenses(ponctuelles)
        projection.append({"mois": debut.isoformat()[:7], "total": str(round(total_mois, 2))})

    # Prochains prélèvements (et versements d'aides) dans les 60 jours
    prochains = []
    for a in abos:
        dates = echeances(a, aujourdhui, aujourdhui + timedelta(days=60))
        if dates:
            prochains.append({
                "id": a.id, "nom": a.nom, "icone": a.icone,
                "date": dates[0].isoformat(), "montant": str(a.prix), "aide": signe(a) < 0,
            })
    prochains.sort(key=lambda p: p["date"])

    return {
        "budget": str(budget) if budget is not None else None,
        "mensuel": str(round(mensuel, 2)),
        "recurrent": str(round(recurrent, 2)),
        "ponctuel": str(round(ponctuel, 2)),
        "aides": str(round(aides, 2)),
        "reste": str(round(budget - mensuel, 2)) if budget is not None else None,
        "categories": categories,
        "zones": zones,
        "abonnements": str(round(total_abos, 2)),
        "categories_abonnements": categories_abonnements,
        "projection": projection,
        "prochains": prochains[:10],
    }


# Doit rester en dernier : sert l'interface sur "/"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")