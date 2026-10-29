# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.logic import (
    ajouter_mois,
    bornes_du_mois,
    cout_par_categorie,
    depenses_par_categorie,
    echeances,
    prelevements_du_mois,
    total_aides,
    total_depenses,
    total_mensuel,
)
from app.models import Abonnement, Depense, Frequence, TypeRecurrent


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


def test_cout_par_categorie_lisse_au_mois():
    abos = [
        Abonnement(nom="Spotify", prix=Decimal("11.99"), frequence=Frequence.MENSUEL, categorie="Musique"),
        Abonnement(nom="Deezer", prix=Decimal("120"), frequence=Frequence.ANNUEL, categorie="Musique"),
        Abonnement(nom="Divers", prix=Decimal("3"), frequence=Frequence.TRIMESTRIEL),
    ]
    assert cout_par_categorie(abos) == {"Musique": Decimal("21.99"), "Sans catégorie": Decimal("1")}


def test_aide_au_logement_deduite_du_loyer():
    # Budget 1000 €, loyer 600 €, APL 350 € : il reste 750 €
    loyer = Abonnement(nom="Loyer", prix=Decimal("600"), frequence=Frequence.MENSUEL,
                       categorie="Logement", type=TypeRecurrent.CHARGE)
    apl = Abonnement(nom="APL", prix=Decimal("350"), frequence=Frequence.MENSUEL,
                     categorie="Logement", type=TypeRecurrent.AIDE)
    assert total_mensuel([loyer, apl]) == Decimal("250")
    assert Decimal("1000") - total_mensuel([loyer, apl]) == Decimal("750")
    assert cout_par_categorie([loyer, apl]) == {"Logement": Decimal("250")}
    assert total_aides([loyer, apl], []) == Decimal("350")


def test_aide_versee_compte_en_negatif_dans_le_mois():
    apl = Abonnement(nom="APL", prix=Decimal("350"), frequence=Frequence.MENSUEL,
                     date_prelevement=date(2026, 9, 5), type=TypeRecurrent.AIDE)
    assert prelevements_du_mois(apl, date(2026, 10, 1), date(2026, 10, 31)) == Decimal("-350")


def test_remboursement_deduit_des_depenses():
    depenses = [
        Depense(libelle="Médecin", montant=Decimal("30"), categorie="Santé", date=date(2026, 10, 2)),
        Depense(libelle="Remboursement Sécu", montant=Decimal("21"), categorie="Santé",
                date=date(2026, 10, 9), remboursement=True),
    ]
    assert total_depenses(depenses) == Decimal("9")
    assert depenses_par_categorie(depenses) == {"Santé": Decimal("9")}
    assert total_aides([], depenses) == Decimal("21")


@pytest.mark.parametrize("prix", ["0", "-5", "NaN", "Infinity", "1e400"])
def test_montant_aberrant_refuse(prix):
    with pytest.raises(ValidationError):
        Abonnement(nom="Test", prix=prix, frequence=Frequence.MENSUEL)


def test_texte_trop_long_refuse():
    with pytest.raises(ValidationError):
        Depense(libelle="x" * 101, montant=Decimal("1"), date=date(2026, 10, 1))
