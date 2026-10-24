from decimal import Decimal

from app.logic import total_mensuel
from app.models import Abonnement, Frequence


def test_total_mensuel():
    abos = [
        Abonnement(nom="Netflix", prix=Decimal("10"), frequence=Frequence.MENSUEL),
        Abonnement(nom="Domaine", prix=Decimal("120"), frequence=Frequence.ANNUEL),
    ]
    assert total_mensuel(abos) == Decimal("20")