from datetime import date
from decimal import Decimal

from app.logic import (
    ajouter_mois,
    bornes_du_mois,
    depenses_par_categorie,
    echeances,
    total_depenses,
)
from app.models import Abonnement, Depense, Frequence


def test_ajouter_mois_fin_de_mois():
    assert ajouter_mois(date(2026, 1, 31), 1) == date(2026, 2, 28)


def test_echeances_trimestriel():
    abo = Abonnement(nom="Assurance", prix=Decimal("30"), frequence=Frequence.TRIMESTRIEL,
                     date_prelevement=date(2026, 1, 15))
    assert echeances(abo, date(2026, 2, 1), date(2026, 8, 1)) == [date(2026, 4, 15), date(2026, 7, 15)]


def test_echeances_date_dans_le_futur():
    abo = Abonnement(nom="Netflix", prix=Decimal("10"), frequence=Frequence.MENSUEL,
                     date_prelevement=date(2026, 12, 5))
    assert echeances(abo, date(2026, 10, 1), date(2026, 10, 31)) == [date(2026, 10, 5)]


def test_bornes_du_mois_fevrier_bissextile():
    assert bornes_du_mois(date(2028, 2, 14)) == (date(2028, 2, 1), date(2028, 2, 29))


def test_depenses_par_categorie():
    depenses = [
        Depense(libelle="Essence", montant=Decimal("60.50"), categorie="Transport", date=date(2026, 10, 3)),
        Depense(libelle="Péage", montant=Decimal("9.50"), categorie="Transport", date=date(2026, 10, 3)),
        Depense(libelle="Divers", montant=Decimal("5"), date=date(2026, 10, 4)),
    ]
    assert total_depenses(depenses) == Decimal("75")
    assert depenses_par_categorie(depenses) == {"Transport": Decimal("70"), "Sans catégorie": Decimal("5")}
