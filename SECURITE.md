# Sécurité

> Mon budget — © 2026 Maël Sohier. Revue de sécurité du 29 octobre 2026, version 1.0.0.

## Modèle de menace

Mon budget est un petit serveur web local : il tourne sur l'ordinateur de l'utilisateur et
s'affiche dans son navigateur. Les risques réalistes sont :

1. **Un site web malveillant**, ouvert dans le même navigateur, qui essaie de lire ou de
   modifier les données en appelant `http://127.0.0.1:8000`.
2. **Une machine du réseau local** qui tente de se connecter à l'appli.
3. **Une saisie aberrante ou piégée** : injection de code dans la page ou dans la base.
4. **Une dépendance vulnérable.**
5. **Un autre compte utilisateur** sur le même ordinateur.

## Mesures en place

| Risque | Protection | Où |
|---|---|---|
| Accès depuis le réseau | Le serveur n'écoute que sur `127.0.0.1` | `run.py` |
| Site malveillant (*DNS rebinding*) | Seuls les en-têtes `Host` `127.0.0.1` et `localhost` sont acceptés (sinon réponse 400) | `TrustedHostMiddleware`, `app/main.py` |
| Site malveillant (CSRF) | Toute modification venant d'une autre origine est refusée (403) ; l'API n'accepte que du JSON, sans CORS | middleware `securite`, `app/main.py` |
| Injection de script (XSS) | Le DOM est construit avec `textContent` (jamais `innerHTML` avec des données) ; une politique CSP stricte (`script-src 'self'`, aucun script intégré à la page) | `static/app.js`, `app/main.py` |
| Intégration dans un cadre (*clickjacking*) | `X-Frame-Options: DENY` et `frame-ancestors 'none'` | `app/main.py` |
| Fuites diverses | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` sur l'API | `app/main.py` |
| Injection SQL | Requêtes paramétrées partout | `app/database.py` |
| Saisies aberrantes | Validation Pydantic : montants entre 0 et 1 000 000 €, `NaN` et `Infinity` refusés, textes de 100 caractères au plus | `app/models.py`, testé dans `tests/` |
| Ressources externes | Aucune à l'exécution. Pages `/docs` et `/redoc` désactivées, car elles chargeaient des scripts depuis un CDN | `app/main.py` |
| Autres comptes du PC | Dossier de données en `700` sous Linux ; profil `AppData` sous Windows | `app/database.py` |
| Dépendances | Versions figées dans `requirements.txt` et auditées avec `pip-audit` | voir ci-dessous |
| Installation | Aucun droit administrateur pour l'appli (installée dans le dossier de l'utilisateur) ; `sudo` uniquement pour installer Python via le gestionnaire de paquets officiel | `installer-linux.sh`, `installation/` |
| Processus fantôme | Le serveur s'arrête seul après 30 minutes sans onglet ouvert | `run.py` |

## Résultats de la revue

- `pip-audit -r requirements.txt` : **aucune vulnérabilité connue** (29/10/2026).
- Tests automatisés : 15 tests au vert, dont le refus des montants aberrants et des textes trop longs.
- Vérifications manuelles sur le serveur lancé :
  - en-tête `Host` étranger → **400** ;
  - modification avec `Origin: https://site-malveillant.example` → **403** ;
  - montant `1e400` → **422** ;
  - `/docs` → **404** ;
  - en-têtes CSP, `X-Frame-Options`, `nosniff` et `Referrer-Policy` présents.
- Installeur Linux testé dans des conteneurs vierges : Ubuntu 22.04 et 24.04, Debian 12,
  Fedora, Rocky Linux 9, Arch Linux, openSUSE Tumbleweed.

## Limites connues

- **Pas d'authentification locale.** Sur un ordinateur **partagé entre plusieurs comptes**,
  un autre utilisateur connecté en même temps pourrait joindre l'appli pendant qu'elle tourne,
  car `127.0.0.1` est commun à toute la machine. Pour un PC personnel, ce risque est
  négligeable. Pour un PC partagé, une évolution possible : un jeton secret généré à chaque
  lancement.
- **Base non chiffrée.** Elle est protégée par la session de l'utilisateur. Activez le
  chiffrement du disque (BitLocker sous Windows, LUKS sous Linux) pour la protéger en cas de
  vol de l'ordinateur.
- **Mises à jour manuelles.** Pour mettre à jour, téléchargez la nouvelle version et relancez
  l'installeur.
- **Installeur Windows** : il est vérifié syntaxiquement (analyseur PowerShell), mais n'a pas
  été exécuté sur un vrai Windows au moment de cette revue.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir de ticket public. Utilisez le signalement privé de GitHub
(onglet *Security* du dépôt → *Report a vulnerability*) ou contactez l'Auteur via
https://github.com/DeSpy3.

## Maintenir le niveau de sécurité

À chaque mise à jour des dépendances :

```bash
pip install -r requirements-dev.txt
python -m pytest
uvx pip-audit -r requirements.txt   # ou : pip install pip-audit && pip-audit -r requirements.txt
```
