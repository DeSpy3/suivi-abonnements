#!/usr/bin/env bash
# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
#
# Installe Mon budget pour l'utilisateur courant (sans droits administrateur, sauf
# si Python doit être installé). Distributions prises en charge : Ubuntu, Debian,
# Linux Mint, Fedora, RHEL/Rocky/Alma, Arch/Manjaro, openSUSE.
#
# Usage : ./installer-linux.sh            (installe puis propose de lancer l'appli)
#         ./installer-linux.sh --sans-lancer
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DONNEES_XDG="${XDG_DATA_HOME:-$HOME/.local/share}"
DEST="$DONNEES_XDG/mon-budget"
LANCER=1
[ "${1:-}" = "--sans-lancer" ] && LANCER=0

info() { printf '\033[1;35m==>\033[0m %s\n' "$*"; }
erreur() { printf '\033[1;31mErreur :\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$SOURCE/run.py" ] || erreur "lance ce script depuis le dossier de Mon budget."
[ "$(id -u)" -ne 0 ] || [ "${MON_BUDGET_ROOT_OK:-}" = 1 ] \
  || erreur "ne lance pas ce script avec sudo : il installe l'appli pour ton utilisateur."

# ---------- Python 3.11 ou plus récent, avec le module venv ----------
python_valide() {
  # Vrai si $1 est un Python ≥ 3.11 capable de créer un environnement virtuel
  command -v "$1" >/dev/null 2>&1 || return 1
  "$1" -c 'import sys; sys.exit(sys.version_info < (3, 11))' 2>/dev/null || return 1
  local essai
  essai="$(mktemp -d)"
  "$1" -m venv "$essai/v" >/dev/null 2>&1 && rm -rf "$essai" && return 0
  rm -rf "$essai"
  return 1
}

trouver_python() {
  for p in python3.14 python3.13 python3.12 python3.11 python3; do
    if python_valide "$p"; then command -v "$p"; return 0; fi
  done
  return 1
}

installer_python() {
  local sudo=""
  [ "$(id -u)" -ne 0 ] && sudo="sudo"
  . /etc/os-release 2>/dev/null || true
  local familles=" ${ID:-} ${ID_LIKE:-} "
  info "Python 3.11+ est nécessaire : installation avec le gestionnaire de paquets (mot de passe demandé)."
  case "$familles" in
    *" debian "*|*" ubuntu "*)
      $sudo apt-get update -q
      $sudo apt-get install -y -q python3 python3-venv
      # Ubuntu 22.04 n'a que Python 3.10 par défaut : on ajoute la 3.11
      trouver_python >/dev/null || $sudo apt-get install -y -q python3.11 python3.11-venv ;;
    *" fedora "*|*" rhel "*|*" centos "*)
      $sudo dnf install -y python3
      trouver_python >/dev/null || $sudo dnf install -y python3.12 || $sudo dnf install -y python3.11 ;;
    *" arch "*)
      $sudo pacman -Sy --needed --noconfirm python ;;
    *" suse "*|*" opensuse "*)
      $sudo zypper --non-interactive install python3
      trouver_python >/dev/null || $sudo zypper --non-interactive install python311 ;;
    *)
      erreur "distribution non reconnue. Installe Python 3.11 ou plus récent (avec venv), puis relance ce script." ;;
  esac
}

PYTHON="$(trouver_python || true)"
if [ -z "$PYTHON" ]; then
  installer_python
  PYTHON="$(trouver_python || true)"
  [ -n "$PYTHON" ] || erreur "impossible d'installer Python 3.11+. Installe-le à la main puis relance ce script."
fi
info "Python utilisé : $PYTHON ($("$PYTHON" --version))"

# ---------- Copie de l'appli ----------
# Tes données (la base) sont dans un autre dossier : une réinstallation ne les touche pas
info "Installation dans $DEST"
mkdir -p "$DEST"
rm -rf "$DEST/app"
mkdir -p "$DEST/app"
for element in app static scripts run.py requirements.txt LICENSE README.md CONFORMITE.md SECURITE.md; do
  [ -e "$SOURCE/$element" ] && cp -r "$SOURCE/$element" "$DEST/app/"
done
find "$DEST/app" -name __pycache__ -type d -prune -exec rm -rf {} +
cp "$SOURCE/installation/desinstaller-linux.sh" "$DEST/desinstaller.sh"
chmod +x "$DEST/desinstaller.sh"

# ---------- Environnement Python isolé ----------
info "Installation des dépendances (connexion Internet nécessaire)"
rm -rf "$DEST/venv"
"$PYTHON" -m venv "$DEST/venv"
"$DEST/venv/bin/python" -m pip install --disable-pip-version-check -q -r "$DEST/app/requirements.txt"

if [ -z "$(ls -A "$DEST/app/static/logos" 2>/dev/null)" ]; then
  info "Téléchargement des logos des services"
  "$DEST/venv/bin/python" "$DEST/app/scripts/telecharger_logos.py" >/dev/null \
    || echo "  (logos non téléchargés : l'appli affichera des pastilles colorées)"
fi

# ---------- Lanceur et entrée dans le menu des applications ----------
cat > "$DEST/mon-budget" <<EOF
#!/bin/sh
exec "$DEST/venv/bin/python" "$DEST/app/run.py" "\$@"
EOF
chmod +x "$DEST/mon-budget"
mkdir -p "$HOME/.local/bin"
ln -sf "$DEST/mon-budget" "$HOME/.local/bin/mon-budget"

mkdir -p "$DONNEES_XDG/applications"
cat > "$DONNEES_XDG/applications/mon-budget.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Mon budget
Comment=Suivi local de tes abonnements, charges et dépenses
Exec="$DEST/mon-budget"
Icon=$DEST/app/static/icone.png
Terminal=false
Categories=Office;Finance;
StartupNotify=false
EOF
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$DONNEES_XDG/applications" || true

info "Mon budget est installé."
echo "  - Lance-le depuis le menu des applications (« Mon budget ») ou avec la commande : mon-budget"
echo "  - Pour le désinstaller : $DEST/desinstaller.sh"

if [ "$LANCER" = 1 ] && [ -t 0 ]; then
  read -r -p "Lancer Mon budget maintenant ? [O/n] " reponse
  case "${reponse:-o}" in
    [nN]*) ;;
    *) nohup "$DEST/mon-budget" >/dev/null 2>&1 & ;;
  esac
fi
