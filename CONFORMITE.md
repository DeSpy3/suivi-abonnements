# Conformité réglementaire

> Mon budget — © 2026 Maël Sohier. Analyse établie le 29 octobre 2026 pour la version 1.0.0.
> Ce document est une analyse de bonne foi, pas un avis juridique. En cas de diffusion
> commerciale ou professionnelle, faites-le relire par un juriste.

## En résumé

| Texte | S'applique ? | Pourquoi |
|---|---|---|
| RGPD | Non pour l'Auteur ; non pour l'utilisateur dans un cadre personnel | Aucune donnée ne quitte l'ordinateur ; usage domestique exclu du RGPD |
| Loi Informatique et Libertés / CNIL (traceurs) | Conforme | Aucun cookie, une seule préférence locale (le thème), exemptée de consentement |
| NIS2 | Non | Vise les entités essentielles et importantes, pas un outil personnel |
| Cyber Resilience Act (CRA) | Non, tant que la diffusion reste gratuite et non commerciale | Ne vise que les produits mis sur le marché dans le cadre d'une activité commerciale |
| Accessibilité (RGAA, directive européenne 2019/882) | Non obligatoire | Concerne le secteur public et certaines entreprises ; efforts faits quand même |
| Droit d'auteur, licences tierces | Conforme | Licences permissives respectées ; propriété de l'Auteur affirmée |

## 1. RGPD (règlement (UE) 2016/679)

**Ce que fait l'outil.** Mon budget enregistre des abonnements, des charges, des dépenses,
des aides et des budgets. Ces données sont stockées dans un fichier SQLite **sur l'ordinateur
de l'utilisateur**, dans son dossier personnel :

- Linux : `~/.local/share/suivi-abonnements/abonnements.db`
- Windows : `%LOCALAPPDATA%\suivi-abonnements\suivi-abonnements\abonnements.db`

Le serveur n'écoute que sur `127.0.0.1` : il est inaccessible depuis le réseau. Il n'y a ni
compte, ni télémétrie, ni statistiques, ni publicité, ni appel à un service externe pendant
l'utilisation.

**Conséquences.**

- **L'Auteur ne traite aucune donnée personnelle** : il n'y a accès à aucun moment. Il n'est
  donc pas responsable de traitement et n'a pas de registre, de DPO ou de politique de
  confidentialité au sens du RGPD à tenir.
- **L'utilisateur** qui suit son propre budget relève de l'exception « activité strictement
  personnelle ou domestique » (article 2.2.c et considérant 18 du RGPD) : le RGPD ne
  s'applique pas.
- **Attention** : si l'outil servait à gérer les finances d'autres personnes dans un cadre
  professionnel (association, entreprise, cabinet), l'organisme utilisateur deviendrait
  responsable de traitement et devrait respecter le RGPD lui-même. La licence actuelle
  n'autorise de toute façon pas l'usage professionnel.

**Bonnes pratiques appliquées quand même** (protection des données dès la conception, article 25) :

- *Minimisation* : aucune identité, aucun revenu, aucune coordonnée bancaire n'est demandé.
- *Confidentialité* : base dans un dossier réservé à l'utilisateur (droits `700` sous Linux,
  dossier personnel `AppData` sous Windows).
- *Maîtrise* : l'utilisateur modifie et supprime ses données dans l'appli ; le désinstalleur
  propose d'effacer la base.

**Pistes d'amélioration** : un export CSV (portabilité des données, déjà dans les idées) ;
recommander le chiffrement du disque (BitLocker, LUKS), puisque la base n'est pas chiffrée.

## 2. CNIL : cookies et traceurs (article 82 de la loi Informatique et Libertés)

- Aucun cookie.
- Une seule information est gardée dans le navigateur (`localStorage`) : **le thème de
  couleurs choisi**. Les lignes directrices de la CNIL exemptent de consentement les traceurs
  qui mémorisent les choix de l'utilisateur sur la présentation de l'interface. Aucun bandeau
  n'est donc nécessaire.
- Aucune police, aucun script ni aucune image n'est chargé depuis Internet pendant
  l'utilisation : la politique de sécurité du contenu (CSP) de l'appli l'interdit.

**Connexions réseau à l'installation uniquement** (l'adresse IP est alors vue par ces services) :

| Service | Pourquoi |
|---|---|
| PyPI (`pypi.org`) | Téléchargement des bibliothèques Python |
| winget / python.org (Windows), dépôts de la distribution (Linux) | Installation de Python s'il manque |
| `cdn.simpleicons.org`, `cdn.jsdelivr.net` | Téléchargement des logos des services |

## 3. NIS2 (directive (UE) 2022/2555)

NIS2 impose des obligations de cybersécurité aux **entités essentielles et importantes** :
organisations de taille moyenne ou grande dans des secteurs listés (énergie, santé, banque,
numérique, administrations…). Un logiciel personnel, édité par un particulier et utilisé
hors ligne, n'entre pas dans son champ, quel que soit l'état de sa transposition en droit
français.

Les mesures de sécurité décrites dans [SECURITE.md](SECURITE.md) suivent néanmoins le même
esprit : réduction de la surface d'attaque, dépendances à jour et vérifiées, procédure de
signalement des vulnérabilités.

## 4. Cyber Resilience Act (règlement (UE) 2024/2847)

Le CRA impose des exigences de sécurité aux produits comportant des éléments numériques
**mis à disposition sur le marché dans le cadre d'une activité commerciale**. Ses obligations
s'appliquent progressivement jusqu'en décembre 2027. Un logiciel diffusé gratuitement, sans
monétisation, par un particulier n'est pas concerné.

**À surveiller** : si Mon budget devenait payant, accompagné d'un service payant ou distribué
par une entreprise, le CRA s'appliquerait. Il faudrait alors notamment : une évaluation des
risques, une gestion des vulnérabilités pendant la durée de support, le signalement des
vulnérabilités activement exploitées, le marquage CE et une documentation technique.

## 5. Accessibilité

Le RGAA vise le secteur public et les grandes entreprises. La directive (UE) 2019/882
(European Accessibility Act) vise certains produits et services commerciaux. Aucun des deux
n'est obligatoire ici. L'interface prévoit quand même : des libellés `aria-label`, une
navigation au clavier, des focus visibles, des thèmes clair et sombre, et une langue déclarée
(`lang="fr"`).

## 6. Propriété intellectuelle et licences

- **Mon budget** est la propriété de **Maël Sohier**, tous droits réservés. Voir [LICENSE](LICENSE).
  L'en-tête de chaque fichier source le rappelle, ainsi que le pied de page de l'appli.
- **Bibliothèques utilisées**. Elles sont installées par `pip` avec leurs fichiers de licence,
  et ne sont pas redistribuées dans ce dépôt :

| Bibliothèque | Licence |
|---|---|
| FastAPI, Pydantic, pydantic-core, AnyIO, h11, platformdirs, annotated-types, annotated-doc, typing-inspection | MIT |
| Starlette, Uvicorn, Click, idna | BSD-3-Clause |
| opentelemetry-api | Apache-2.0 |
| typing_extensions | PSF-2.0 |
| pytest et ses dépendances (tests uniquement) | MIT |

Ces licences permissives autorisent l'usage dans un logiciel propriétaire, à condition de
conserver leurs mentions, ce que fait `pip`.

- **Logos des services** : ils proviennent du projet Simple Icons (licence CC0). Les **marques**
  restent la propriété de leurs titulaires. Les logos ne sont pas dans le dépôt : chaque
  utilisateur les télécharge chez lui, et ils servent uniquement à identifier le service
  choisi (usage dit « nominatif »).

  ⚠️ **Point d'attention** : certaines marques ont demandé leur retrait de Simple Icons.
  `scripts/telecharger_logos.py` récupère alors leur logo dans une ancienne version du projet
  (Amazon Prime, ChatGPT, Microsoft 365, Xbox, Canva, Adobe, Nintendo). Pour un usage
  personnel, le risque est très faible. **Avant toute diffusion large ou commerciale,
  supprimer ce repli** : ces services s'afficheront alors avec une pastille colorée.
