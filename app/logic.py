import calendar
from datetime import date
from decimal import Decimal

from app.models import Abonnement, Depense, Frequence

SANS_CATEGORIE = "Sans catégorie"

MOIS_PAR_PERIODE = {
    Frequence.MENSUEL: 1,
    Frequence.TRIMESTRIEL: 3,
    Frequence.ANNUEL: 12,
}


def cout_mensuel(abonnement: Abonnement) -> Decimal:
    return abonnement.prix / MOIS_PAR_PERIODE[abonnement.frequence]


def total_mensuel(abonnements: list[Abonnement]) -> Decimal:
    return sum((cout_mensuel(a) for a in abonnements), Decimal("0"))


def cout_par_categorie(abonnements: list[Abonnement]) -> dict[str, Decimal]:
    """Coût mensuel lissé des dépenses récurrentes, par catégorie."""
    totaux: dict[str, Decimal] = {}
    for a in abonnements:
        cle = a.categorie or SANS_CATEGORIE
        totaux[cle] = totaux.get(cle, Decimal("0")) + cout_mensuel(a)
    return totaux


def ajouter_mois(d: date, n: int) -> date:
    """Ajoute n mois à une date, en ramenant le jour à la fin du mois si besoin."""
    annee, mois = divmod(d.year * 12 + (d.month - 1) + n, 12)
    mois += 1
    jour = min(d.day, calendar.monthrange(annee, mois)[1])
    return date(annee, mois, jour)


def echeances(abo: Abonnement, debut: date, fin: date) -> list[date]:
    """Dates de prélèvement de l'abonnement entre debut et fin (inclus)."""
    if abo.date_prelevement is None:
        return []
    pas = MOIS_PAR_PERIODE[abo.frequence]
    ref = abo.date_prelevement
    # La série se prolonge dans le passé comme dans le futur : on part d'un cran avant le début
    ecart = (debut.year * 12 + debut.month) - (ref.year * 12 + ref.month)
    resultat = []
    k = ecart // pas - 1
    while True:
        d = ajouter_mois(ref, k * pas)
        if d > fin:
            return resultat
        if d >= debut:
            resultat.append(d)
        k += 1


def prelevements_du_mois(abo: Abonnement, debut: date, fin: date) -> Decimal:
    """Argent réellement prélevé sur la période. Sans date connue : coût mensuel lissé."""
    if abo.date_prelevement is None:
        return cout_mensuel(abo)
    return abo.prix * len(echeances(abo, debut, fin))


def bornes_du_mois(d: date) -> tuple[date, date]:
    """Premier et dernier jour du mois contenant d."""
    return d.replace(day=1), d.replace(day=calendar.monthrange(d.year, d.month)[1])


def total_depenses(depenses: list[Depense]) -> Decimal:
    return sum((d.montant for d in depenses), Decimal("0"))


def depenses_par_categorie(depenses: list[Depense]) -> dict[str, Decimal]:
    """Total des dépenses ponctuelles par catégorie."""
    totaux: dict[str, Decimal] = {}
    for d in depenses:
        cle = d.categorie or SANS_CATEGORIE
        totaux[cle] = totaux.get(cle, Decimal("0")) + d.montant
    return totaux
