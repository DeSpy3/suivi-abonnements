from decimal import Decimal
from enum import Enum
from pydantic import BaseModel

class Frequence(str, Enum):
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    ANNUEL = "annuel"

class Abonnement(BaseModel):
    nom : str
    prix : Decimal
    frequence : Frequence
    categorie : str | None = None