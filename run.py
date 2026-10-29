# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
"""Lance Mon budget : démarre le serveur local et ouvre le navigateur.

- Si l'appli tourne déjà, ouvre seulement le navigateur dessus.
- Si le port 8000 est pris par un autre programme, en choisit un libre.
- S'arrête toute seule quand plus aucun onglet ne l'utilise depuis 30 minutes.
"""
import socket
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

from platformdirs import user_data_dir

DOSSIER = Path(user_data_dir("suivi-abonnements"))
DOSSIER.mkdir(mode=0o700, parents=True, exist_ok=True)

# Lancé sans console (pythonw sous Windows) : pas de sortie standard, on écrit dans un journal
if sys.stdout is None or sys.stderr is None:
    sys.stdout = sys.stderr = open(DOSSIER / "journal.txt", "a", encoding="utf-8", buffering=1)  # noqa: SIM115

import uvicorn  # noqa: E402 (après la redirection : uvicorn mémorise sys.stderr à l'import)

from app.main import app  # noqa: E402

HOTE = "127.0.0.1"
PORT_PREFERE = 8000
FICHIER_PORT = DOSSIER / "port.txt"
ARRET_APRES = 30 * 60  # secondes sans aucune requête (la page envoie un signal toutes les 5 minutes)


def deja_lance(port: int) -> bool:
    """Vrai si Mon budget répond déjà sur ce port."""
    try:
        with urllib.request.urlopen(f"http://{HOTE}:{port}/", timeout=1) as r:
            return b"<title>Mon budget</title>" in r.read(2000)
    except OSError:
        return False


def port_libre(port: int) -> bool:
    with socket.socket() as s:
        try:
            s.bind((HOTE, port))
            return True
        except OSError:
            return False


def port_memorise() -> int:
    """Port du dernier lancement (l'appli a pu prendre un autre port que 8000)."""
    try:
        return int(FICHIER_PORT.read_text())
    except (OSError, ValueError):
        return PORT_PREFERE


def choisir_port() -> int:
    if port_libre(PORT_PREFERE):
        return PORT_PREFERE
    with socket.socket() as s:
        s.bind((HOTE, 0))  # 0 : le système choisit un port libre
        return s.getsockname()[1]


def surveiller(serveur: uvicorn.Server, url: str) -> None:
    """Ouvre le navigateur une fois le serveur prêt, puis l'arrête quand il n'est plus utilisé."""
    while not serveur.started:
        time.sleep(0.1)
    webbrowser.open(url)
    while not serveur.should_exit:
        time.sleep(30)
        if time.monotonic() - app.state.derniere_activite > ARRET_APRES:
            print("Aucune activité depuis 30 minutes : arrêt.")
            serveur.should_exit = True


def main() -> None:
    # Déjà ouvert (par exemple double-clic sur le raccourci) : on montre la fenêtre existante
    for port in {PORT_PREFERE, port_memorise()}:
        if deja_lance(port):
            webbrowser.open(f"http://{HOTE}:{port}")
            return

    port = choisir_port()
    FICHIER_PORT.write_text(str(port))
    url = f"http://{HOTE}:{port}"
    print(f"Mon budget tourne sur {url} (Ctrl+C pour arrêter)")

    serveur = uvicorn.Server(uvicorn.Config(app, host=HOTE, port=port, log_level="warning"))
    threading.Thread(target=surveiller, args=(serveur, url), daemon=True).start()
    serveur.run()


if __name__ == "__main__":
    main()
