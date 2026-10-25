import threading
import webbrowser

import uvicorn

from app.main import app

URL = "http://127.0.0.1:8000"

if __name__ == "__main__":
    threading.Timer(1.0, lambda: webbrowser.open(URL)).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)