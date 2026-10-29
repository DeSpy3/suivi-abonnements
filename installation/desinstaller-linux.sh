#!/usr/bin/env bash
# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
# Désinstalle Mon budget. Tes données sont conservées, sauf si tu demandes à les supprimer.
set -euo pipefail

DONNEES_XDG="${XDG_DATA_HOME:-$HOME/.local/share}"
DEST="$DONNEES_XDG/mon-budget"
# Même dossier que platformdirs.user_data_dir("suivi-abonnements") sous Linux
BASE="$DONNEES_XDG/suivi-abonnements"

pkill -f "$DEST/app/run.py" 2>/dev/null || true
rm -f "$DONNEES_XDG/applications/mon-budget.desktop" "$HOME/.local/bin/mon-budget"
rm -rf "$DEST"
echo "Mon budget est désinstallé."

if [ -d "$BASE" ]; then
  echo "Tes données (abonnements, dépenses, budgets) sont toujours dans : $BASE"
  if [ -t 0 ]; then
    read -r -p "Les supprimer définitivement ? [o/N] " reponse
    case "${reponse:-n}" in
      [oO]*) rm -rf "$BASE"; echo "Données supprimées." ;;
      *) echo "Données conservées : une réinstallation les retrouvera." ;;
    esac
  fi
fi
