"""
your_app.py — Compatibility shim untuk Leapcell default start command.

============================================================
KENAPA FILE INI ADA?
============================================================
Leapcell punya default Python start command:

    gunicorn --workers 1 --bind :8080 --timeout 600 your_app.wsgi

Command itu memanggil modul `your_app` dan atribut `wsgi`. Repo ini
sebenarnya pakai FastAPI (`main:app`) yang merupakan ASGI app, bukan
WSGI app bernama `your_app`. File ini sebagai SAFETY NET:

1. Export FastAPI app sebagai `app` (ASGI native).
2. Export REAL WSGI wrapper sebagai `wsgi` lewat `a2wsgi.ASGIMiddleware`
   supaya kalau gunicorn WSGI worker mencarinya, dia dapat callable
   WSGI valid (bukan crash karena ASGI signature).

Ini bikin app TETAP BISA SERVE REQUEST lewat default template Leapcell
tanpa harus override Start Command di dashboard. Tapi performa tidak
sebagus pakai UvicornWorker. Lihat DEPLOY-LEAPCELL.md untuk command
override yang lebih optimal.

============================================================
"""
from __future__ import annotations

from main import app

# Wrap ASGI app jadi WSGI callable supaya kompatibel dengan
# `gunicorn ... your_app.wsgi` default Leapcell.
# a2wsgi.ASGIMiddleware menerima ASGI app, mengekspos WSGI interface.
try:
    from a2wsgi import ASGIMiddleware
    wsgi = ASGIMiddleware(app)
except ImportError:
    # Fallback: kalau a2wsgi belum ke-install (build cache lama), pakai
    # ASGI app langsung. Ini akan crash di runtime saat request masuk
    # via WSGI worker, tapi minimal import-resolution lewat.
    wsgi = app

# Alias umum lain biar fleksibel ke berbagai template platform
application = wsgi
asgi_app = app

__all__ = ["app", "wsgi", "application", "asgi_app"]
