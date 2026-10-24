from decimal import Decimal

from app.logic import cout_mensuel, total_mensuel
from app.models import Abonnement, Frequence


def test_total_mensuel():
    abos = [
        Abonnement(nom="Netflix", prix=Decimal("10"), frequence=Frequence.MENSUEL),
        Abonnement(nom="Domaine", prix=Decimal("120"), frequence=Frequence.ANNUEL),
    ]
    assert total_mensuel(abos) == Decimal("20")


def test_cout_mensuel_trimestriel():
    abo = Abonnement(nom="Assurance", prix=Decimal("30"), frequence=Frequence.TRIMESTRIEL)
    assert cout_mensuel(abo) == Decimal("10")


def test_total_liste_vide():
    assert total_mensuel([]) == Decimal("0")