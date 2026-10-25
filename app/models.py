from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class Frequence(str, Enum):
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    ANNUEL = "annuel"


class Abonnement(BaseModel):
    nom: str = Field(min_length=1)
    prix: Decimal = Field(gt=0)
    frequence: Frequence
    categorie: str | None = None
    icone: str | None = None


class AbonnementDB(Abonnement):
    id: int


class AbonnementOut(AbonnementDB):
    cout_mensuel: Decimal