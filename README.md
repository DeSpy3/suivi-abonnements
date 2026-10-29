# Mon budget

Une petite application pour suivre ton budget : **abonnements** (Netflix, Spotify…),
**charges fixes** (loyer, assurance…), **dépenses ponctuelles** (courses, essence…) et
**aides ou remboursements** (APL, CAF, Sécu…). Tu te fixes un budget mensuel, et l'appli te
dit combien il te reste.

- 🔒 **100 % local** : tes données restent sur ton ordinateur. Pas de compte, pas d'Internet
  pendant l'utilisation, pas de publicité ni de pistage.
- 🖥️ **Windows et Linux** : Ubuntu, Debian, Linux Mint, Fedora, Rocky/Alma/RHEL, Arch, Manjaro, openSUSE.
- 🎨 5 thèmes de couleurs (clair, sombre…), une vue d'ensemble avec graphiques, la projection
  sur 6 mois et les prochains prélèvements.

© 2026 Maël Sohier — tous droits réservés. Utilisation personnelle gratuite, voir [LICENSE](LICENSE).

---

## Installation sous Windows (10 ou 11)

1. **Télécharge l'appli** : [suivi-abonnements-main.zip](https://github.com/DeSpy3/suivi-abonnements/archive/refs/heads/main.zip)
   (ou, sur la page GitHub : bouton vert **Code** → **Download ZIP**).
2. **Décompresse le fichier** : clic droit sur le zip → **Extraire tout…**
3. Dans le dossier obtenu, **double-clique sur `installer-windows.bat`**.
   - Si Windows affiche « Windows a protégé votre ordinateur », clique sur
     **Informations complémentaires**, puis **Exécuter quand même**. Ce message apparaît pour
     tout script téléchargé qui n'est pas signé.
   - Si Python n'est pas installé, l'installeur l'installe pour toi (Python 3.13, via winget).
4. C'est prêt : un raccourci **Mon budget** apparaît sur le Bureau et dans le menu Démarrer.

Aucun droit administrateur n'est nécessaire. Une connexion Internet est requise pendant
l'installation uniquement.

## Installation sous Linux

1. **Télécharge et décompresse l'appli** :
   ```bash
   cd ~/Téléchargements    # ou ~/Downloads
   curl -L -o mon-budget.zip https://github.com/DeSpy3/suivi-abonnements/archive/refs/heads/main.zip
   unzip mon-budget.zip && cd suivi-abonnements-main
   ```
   (Tu peux aussi faire `git clone https://github.com/DeSpy3/suivi-abonnements.git`.)
2. **Lance l'installeur**, sans `sudo` :
   ```bash
   ./installer-linux.sh
   ```
   Si Python 3.11 ou plus récent manque, le script l'installe avec le gestionnaire de paquets
   de ta distribution (apt, dnf, pacman ou zypper) et te demande ton mot de passe.
3. C'est prêt : **Mon budget** est dans le menu des applications. Tu peux aussi le lancer
   avec la commande `mon-budget`.

L'installeur a été testé sur Ubuntu 22.04 et 24.04, Debian 12, Fedora, Rocky Linux 9,
Arch Linux et openSUSE Tumbleweed.

## Utilisation

- Ouvre **Mon budget** : l'appli s'affiche dans ton navigateur habituel, à une adresse du type
  `http://127.0.0.1:8000`. Cette page est servie par ton ordinateur lui-même : rien ne passe
  par Internet.
- Relancer le raccourci alors que l'appli est déjà ouverte rouvre simplement la page.
- Pas besoin de « quitter » : l'appli s'arrête toute seule 30 minutes après la fermeture de
  l'onglet.

**Pour commencer :**
1. Clique sur **Budget mensuel** pour fixer ton budget.
2. Onglet **Abonnements** : choisis un service dans la liste (recherche ou filtre par
   catégorie), indique le prix, puis clique sur **Ajouter**.
3. Onglet **Dépenses** :
   - tes **dépenses ponctuelles** du mois ;
   - tes **charges fixes** (bouton « Charge fixe ») ;
   - tes **aides** et **remboursements** : coche « Aide reçue » ou « Remboursement reçu »,
     et le montant sera déduit de tes dépenses.

## Mettre à jour

Télécharge la nouvelle version et relance l'installeur, comme pour la première installation.
**Tes données sont conservées** : elles sont stockées à part.

## Désinstaller

- **Windows** : Paramètres → Applications → **Mon budget** → Désinstaller (ou
  menu Démarrer → *Mon budget* → *Désinstaller Mon budget*).
- **Linux** : `~/.local/share/mon-budget/desinstaller.sh`

Le désinstalleur te demande si tu veux aussi effacer tes données. Par défaut, elles sont gardées.

## Où sont mes données ? (et comment les sauvegarder)

Toutes tes données tiennent dans un seul fichier :

| Système | Emplacement |
|---|---|
| Windows | `%LOCALAPPDATA%\suivi-abonnements\suivi-abonnements\abonnements.db` |
| Linux | `~/.local/share/suivi-abonnements/abonnements.db` |

Pour faire une **sauvegarde**, copie ce fichier (appli fermée) sur une clé USB ou un
disque. Pour **restaurer**, remets-le à la même place.

## Dépannage

| Problème | Solution |
|---|---|
| La page ne s'ouvre pas | Relance le raccourci. Sous Windows, le journal se trouve dans le dossier des données (`journal.txt`). |
| « Python 3.11+ est nécessaire » | Installe Python depuis [python.org](https://www.python.org/downloads/) (Windows : coche *Add python.exe to PATH*), puis relance l'installeur. |
| Pas de logos, seulement des pastilles colorées | Les logos sont téléchargés à l'installation : relance l'installeur avec Internet. |
| Erreur pendant « Installation des dépendances » | Vérifie ta connexion Internet, puis relance l'installeur. |

## Confidentialité, conformité et sécurité

- Aucune donnée n'est collectée par l'auteur. Le RGPD ne s'applique pas à un usage personnel
  et local, et aucun cookie n'est utilisé. Détails dans [CONFORMITE.md](CONFORMITE.md)
  (RGPD, CNIL, NIS2, Cyber Resilience Act, licences).
- Mesures de sécurité, résultats de la revue et signalement d'une faille : [SECURITE.md](SECURITE.md).

## Pour les développeurs

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/telecharger_logos.py   # logos des services (facultatif)
python -m pytest                      # tests
python run.py                         # lance l'appli
```

Stack : Python 3.11+, FastAPI, Pydantic, SQLite, HTML/CSS/JS sans framework.
Structure et règles de conception : voir `Claude.md`.

## Licence

**Mon budget** © 2026 Maël Sohier — tous droits réservés.
Usage personnel et non commercial gratuit. Redistribution, modification publique et usage
commercial interdits sans accord écrit. Voir [LICENSE](LICENSE).

Les noms et logos des services cités appartiennent à leurs propriétaires respectifs ;
Mon budget n'est affilié à aucun d'entre eux.
