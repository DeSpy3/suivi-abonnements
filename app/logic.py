from decimal import Decimal

from app.models import Abonnement, Frequence

MOIS_PAR_PERIODE = {
    Frequence.MENSUEL: 1,
    Frequence.TRIMESTRIEL: 3,
    Frequence.ANNUEL: 12
}

def cout_mensuel(abonnement: Abonnement) -> Decimal:
    """Calcul le coût mensuel d'un abonnement."""
    return abonnement.prix / MOIS_PAR_PERIODE[abonnement.frequence]

def total_mensuel(abonnements: list[Abonnement]) -> Decimal:
    """Calcul le coût mensuel total d'une liste d'abonnements."""
    return sum((cout_mensuel(a) for a in abonnements), Decimal("0"))

