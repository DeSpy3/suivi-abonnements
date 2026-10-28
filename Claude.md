# Mon budget (dépôt suivi-abonnements)

Appli **locale et personnelle** de gestion du budget : abonnements (Netflix, Spotify, etc.),
charges fixes (loyer, assurance…) et dépenses ponctuelles (essence, courses…). Pas de suivi des revenus : on compare à un budget.
Propriétaire : Maël. Elle sert d'abord à son usage perso, d'abord sous Fedora 44 (GNOME), puis Windows.
Maël code sous VS Code et veut progresser en programmation : explique brièvement ce que tu changes.

## Lancer
- `source .venv/bin/activate`
- `python run.py` : démarre le serveur sur http://127.0.0.1:8000 et ouvre le navigateur
- `python -m pytest` : lance les tests (à faire avant chaque commit)

## Stack
Python, FastAPI, Pydantic, SQLite (module sqlite3), platformdirs. Front : HTML/CSS/JS vanilla, sans framework ni build.

## Structure
- `app/models.py` : modèles Pydantic. `Abonnement` = dépense récurrente, avec `type` « abonnement » ou « charge » (charge fixe) ; `Depense` = dépense ponctuelle datée
- `app/logic.py` : calculs purs (coût mensuel, échéances, totaux des dépenses). Pas d'accès base ni FastAPI ici, testable seul
- `app/database.py` : accès SQLite et migrations
- `app/main.py` : routes `/api/*` et service du dossier `static/` (monté en dernier)
- `static/` : `index.html`, `style.css`, `app.js`, `presets.json` (services prédéfinis), `logos/` (ignoré par git)
- `scripts/telecharger_logos.py` : télécharge les logos listés dans `presets.json`
- `tests/` : tests pytest

## Règles de conception
- **Argent = `Decimal`**, jamais `float`. Stocké en TEXT dans SQLite
- La logique métier va dans `logic.py` avec un test. Les routes restent minces
- Serveur uniquement sur `127.0.0.1`, jamais `0.0.0.0`. Aucun service externe
- Base dans le dossier de données utilisateur (`platformdirs`), hors du dépôt. Chemins avec `pathlib`, pour rester portable vers Windows
- Front : construire le DOM avec `textContent` / `createElement`, pas d'`innerHTML` avec des données
- Une migration de base doit être idempotente et ne jamais perdre de données (voir `init_db`)

## API
`GET/POST /api/abonnements`, `PUT/DELETE /api/abonnements/{id}` (abonnements et charges fixes),
`GET /api/depenses?mois=AAAA-MM`, `POST /api/depenses`, `PUT/DELETE /api/depenses/{id}`,
`PUT /api/budget`, `PUT /api/budgets`, `GET /api/synthese` (récurrent lissé + ponctuel du mois courant)

## État actuel
Fait : CRUD, SQLite, catalogue de services avec logos, date de prélèvement, budget global et par catégorie,
projection sur 6 mois, prochains prélèvements, donut par catégorie. Interface en 3 onglets : Vue d'ensemble, Abonnements,
Dépenses (ponctuelles par mois + charges fixes). Design sombre violet inspiré d'une app de finances perso (catégories IA en orange, Musique en rouge, Cloud en bleu).
Une ancienne version bleue du style peut exister dans la branche `style-bleu`.
## Préférences d'interface
- Les services prédéfinis (`presets.json`) doivent s'afficher en **liste** (une ligne par service : logo, nom, catégorie), avec la recherche conservée. Pas en pastilles.


## Idées pour la suite
Alertes avant prélèvement, export CSV, statut actif/résilié, historique des prix, packaging Windows (PyInstaller),
éventuellement réécriture du backend en Rust plus tard (seulement si pertinent).

## Façon de travailler
- Pour tout changement non trivial : propose d'abord un plan court, puis attends mon accord
- Petits changements, tests à jour, `python -m pytest` vert avant de commiter
- Commits en français, un sujet par commit. Ne pousse (`git push`) que si je le demande. Jamais de force push
- Ne commite jamais la base `.db`, `static/logos/`, ni de token ou secret
- Pas de nouvelle dépendance sans me demander

