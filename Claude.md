# Mon budget (dépôt suivi-abonnements)

Appli **locale et personnelle** de gestion du budget : abonnements (Netflix, Spotify, etc.),
charges fixes (loyer, assurance…) et dépenses ponctuelles (essence, courses…). Pas de suivi des revenus : on compare à un budget.
Les aides (APL, CAF…) et remboursements sont de l'argent reçu qui vient **en déduction** des dépenses, pas un revenu.
Propriétaire : Maël Sohier, tous droits réservés (voir `LICENSE` ; en-tête de copyright dans chaque fichier source). Elle sert d'abord à son usage perso, d'abord sous Fedora 44 (GNOME), puis Windows.
Maël code sous VS Code et veut progresser en programmation : explique brièvement ce que tu changes.

## Lancer
- `source .venv/bin/activate`
- `pip install -r requirements-dev.txt` : dépendances + outils de test (`requirements.txt` = appli seule)
- `python run.py` : démarre le serveur sur http://127.0.0.1:8000 (ou un port libre) et ouvre le navigateur.
  S'il tourne déjà, ouvre juste la page. S'arrête seul après 30 min sans onglet (la page envoie `/api/ping` toutes les 5 min)
- `python -m pytest` : lance les tests (à faire avant chaque commit)
- `uvx pip-audit -r requirements.txt` : vérifie les failles connues des dépendances

## Installation pour les utilisateurs
Pas d'hébergement : chacun installe l'appli sur son PC (voir `README.md`).
- Linux : `installer-linux.sh` (apt/dnf/pacman/zypper pour Python si besoin) → `~/.local/share/mon-budget/` + entrée `.desktop`
- Windows : `installer-windows.bat` → `installation/installer-windows.ps1` (winget pour Python) → `%LOCALAPPDATA%\MonBudget\`,
  raccourcis Bureau/menu Démarrer, entrée dans « Applications installées ». Les `.ps1` doivent rester en UTF-8 **avec BOM** (accents sous PowerShell 5.1)
- Désinstalleurs dans `installation/`. Les données (base) sont dans un autre dossier et survivent aux réinstallations
- Python 3.11 minimum (exigé par Starlette)

## Stack
Python, FastAPI, Pydantic, SQLite (module sqlite3), platformdirs. Front : HTML/CSS/JS vanilla, sans framework ni build.

## Structure
- `app/models.py` : modèles Pydantic. `Abonnement` = dépense récurrente, avec `type` « abonnement », « charge » (charge fixe) ou « aide » (argent reçu régulièrement) ; `Depense` = dépense ponctuelle datée, `remboursement=True` si c'est de l'argent reçu
- `app/logic.py` : calculs purs (coût mensuel, échéances, totaux des dépenses). Pas d'accès base ni FastAPI ici, testable seul
- `app/database.py` : accès SQLite et migrations
- `app/main.py` : routes `/api/*` et service du dossier `static/` (monté en dernier)
- `static/` : `index.html`, `style.css`, `app.js`, `presets.json` (services prédéfinis), `logos/` (ignoré par git)
- `scripts/telecharger_logos.py` : télécharge les logos listés dans `presets.json` (Simple Icons, avec repli sur la version 9.21.0 pour les marques retirées ; `"logo": false` = pas de logo, pastille colorée)
- `scripts/generer_icones.py` : génère `static/icone.{svg,png,ico}` (Python pur)
- `tests/` : tests pytest
- `README.md` (installation), `LICENSE`, `CONFORMITE.md` (RGPD, CNIL, NIS2, CRA, licences), `SECURITE.md` (revue de sécurité)

## Règles de conception
- **Argent = `Decimal`**, jamais `float`. Stocké en TEXT dans SQLite
- La logique métier va dans `logic.py` avec un test. Les routes restent minces
- Serveur uniquement sur `127.0.0.1`, jamais `0.0.0.0`. Aucun service externe à l'exécution (pas de CDN, police ou script distant)
- Sécurité (`app/main.py`) : hôtes autorisés (anti DNS rebinding), refus des modifications d'une autre origine, CSP stricte.
  Donc **aucun script ni style intégré dans le HTML** (`<script>…</script>`, `style="…"`) : tout va dans des fichiers. `element.style.x = …` en JS reste permis
- Limites de saisie dans `models.py` (montants ≤ 1 000 000, textes ≤ 100 caractères)
- Base dans le dossier de données utilisateur (`platformdirs`), hors du dépôt. Chemins avec `pathlib`, pour rester portable vers Windows
- Front : construire le DOM avec `textContent` / `createElement`, pas d'`innerHTML` avec des données
- Une migration de base doit être idempotente et ne jamais perdre de données (voir `init_db`)

## API
`GET/POST /api/abonnements`, `PUT/DELETE /api/abonnements/{id}` (abonnements et charges fixes),
`GET /api/depenses?mois=AAAA-MM`, `POST /api/depenses`, `PUT/DELETE /api/depenses/{id}`,
`PUT /api/budget`, `PUT /api/budgets`, `GET /api/synthese` (récurrent lissé + ponctuel du mois courant)

## État actuel
Fait : CRUD, SQLite, catalogue de services avec logos, date de prélèvement, budget global et par catégorie,
projection sur 6 mois, prochains prélèvements, donut par grande zone (abonnements, charges fixes, ponctuel) dans la vue d'ensemble et donut des abonnements par catégorie dans leur onglet. Aides régulières et remboursements déduits du total (net) et des catégories. Catalogue de services rangé par catégorie avec filtre. Interface en 3 onglets : Vue d'ensemble, Abonnements,
Dépenses (ponctuelles par mois + charges fixes). Design inspiré d'une app de finances perso (catégories IA en orange, Musique en rouge, Cloud en bleu), avec 5 thèmes au choix dans l'en-tête : Violet sombre (par défaut), Bleu nuit, Forêt, Clair, Crème, ou automatique (suit le système). Les couleurs sont des variables CSS par thème (`:root[data-theme=…]` dans `style.css`) ; les graphiques lisent `--serie-1…6`, `--zone-*` et `--accent`. Choix mémorisé dans `localStorage`.
Une ancienne version bleue du style peut exister dans la branche `style-bleu`.
## Préférences d'interface
- Les services prédéfinis (`presets.json`) doivent s'afficher en **liste** (une ligne par service : logo, nom, catégorie), avec la recherche conservée. Pas en pastilles.


## Idées pour la suite
Alertes avant prélèvement, export CSV, statut actif/résilié, historique des prix, exécutable autonome (PyInstaller) pour éviter d'installer Python,
jeton d'accès local (PC partagés, voir `SECURITE.md`),
éventuellement réécriture du backend en Rust plus tard (seulement si pertinent).

## Façon de travailler
- Pour tout changement non trivial : propose d'abord un plan court, puis attends mon accord
- Petits changements, tests à jour, `python -m pytest` vert avant de commiter
- Commits en français, un sujet par commit. Ne pousse (`git push`) que si je le demande. Jamais de force push
- Ne commite jamais la base `.db`, `static/logos/`, ni de token ou secret
- Pas de nouvelle dépendance sans me demander

