from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class Frequence(str, Enum):
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    ANNUEL = "annuel"


class TypeRecurrent(str, Enum):
    ABONNEMENT = "abonnement"  # Netflix, Spotify…
    CHARGE = "charge"  # charge fixe : loyer, assurance…


class Abonnement(BaseModel):
    """Dépense récurrente : abonnement ou charge fixe."""

    nom: str = Field(min_length=1)
    prix: Decimal = Field(gt=0)
    frequence: Frequence
    categorie: str | None = None
    icone: str | None = None
    date_prelevement: date | None = None  # un prélèvement connu (passé ou à venir)
    type: TypeRecurrent = TypeRecurrent.ABONNEMENT


class AbonnementDB(Abonnement):
    id: int


class AbonnementOut(AbonnementDB):
    cout_mensuel: Decimal


class Depense(BaseModel):
    """Dépense ponctuelle : essence, courses, restaurant…"""

    libelle: str = Field(min_length=1)
    montant: Decimal = Field(gt=0)
    categorie: str | None = None
    date: date


class DepenseDB(Depense):
    id: int


class BudgetIn(BaseModel):
    montant: Decimal | None = Field(default=None, ge=0)


class BudgetCategorieIn(BudgetIn):
    categorie: str = Field(min_length=1)