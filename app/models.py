# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field

# Garde-fous contre les saisies aberrantes
MONTANT_MAX = Decimal("1000000")
TEXTE_MAX = 100


class Frequence(str, Enum):
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    ANNUEL = "annuel"


class TypeRecurrent(str, Enum):
    ABONNEMENT = "abonnement"  # Netflix, Spotify…
    CHARGE = "charge"  # charge fixe : loyer, assurance…
    AIDE = "aide"  # argent reçu régulièrement : APL, CAF… (vient en déduction)


class Abonnement(BaseModel):
    """Dépense récurrente : abonnement ou charge fixe."""

    nom: str = Field(min_length=1, max_length=TEXTE_MAX)
    prix: Decimal = Field(gt=0, le=MONTANT_MAX)
    frequence: Frequence
    categorie: str | None = Field(default=None, max_length=TEXTE_MAX)
    icone: str | None = Field(default=None, max_length=TEXTE_MAX)
    date_prelevement: date | None = None  # un prélèvement connu (passé ou à venir)
    type: TypeRecurrent = TypeRecurrent.ABONNEMENT


class AbonnementDB(Abonnement):
    id: int


class AbonnementOut(AbonnementDB):
    cout_mensuel: Decimal


class Depense(BaseModel):
    """Dépense ponctuelle : essence, courses, restaurant…"""

    libelle: str = Field(min_length=1, max_length=TEXTE_MAX)
    montant: Decimal = Field(gt=0, le=MONTANT_MAX)
    categorie: str | None = Field(default=None, max_length=TEXTE_MAX)
    date: date
    remboursement: bool = False  # argent reçu : vient en déduction des dépenses


class DepenseDB(Depense):
    id: int


class BudgetIn(BaseModel):
    montant: Decimal | None = Field(default=None, ge=0, le=MONTANT_MAX)


class BudgetCategorieIn(BudgetIn):
    categorie: str = Field(min_length=1, max_length=TEXTE_MAX)