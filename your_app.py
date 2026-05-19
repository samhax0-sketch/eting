"""
your_app.py — Compatibility shim untuk Leapcell default start command.

============================================================
KENAPA FILE INI ADA?
============================================================
Leapcell punya default Python start command:

    gunicorn --workers 1 --bind :8080 --timeout 600 your_app.wsgi

Command itu memanggil modul `your_app` dan atribut `wsgi`. Repo ini
sebenarnya pakai FastAPI (`main:app`), bukan WSGI app bernama
`your_app`. File ini sebagai SAFETY NET: kalau Start Command di
dashboard Leapcell tidak ke-override, default template masih akan
menemukan callable `wsgi` di sini dan app tetap bisa boot.

CATATAN:
- FastAPI adalah ASGI, bukan WSGI. Memanggilnya lewat gunicorn vanilla
  WSGI worker akan crash saat request masuk (`'lifespan' protocol not
  supported`).
- Itu sebabnya kita juga sediakan `wsgi` sebagai WSGI-wrapped version
  dari ASGI app pakai `asgiref.wsgi.WsgiToAsgi` reverse — TIDAK BISA
  langsung (asgiref hanya menyediakan WsgiToAsgi, bukan AsgiToWsgi).
- Solusi paling robust: **override Start Command** di dashboard Leapcell
  ke perintah berikut (juga ada di DEPLOY-LEAPCELL.md):

    gunicorn main:app --workers 2 \\
        --worker-class uvicorn.workers.UvicornWorker \\
        --bind 0.0.0.0:$PORT --timeout 600 \\
        --forwarded-allow-ips=*

File ini hanya mempermudah deteksi awal: minimal app bisa import
tanpa error `ModuleNotFoundError: No module named 'your_app'`.

============================================================
"""
from __future__ import annotations

# Re-export FastAPI app dari main.py
# `app` adalah ASGI app — tidak kompatibel langsung dengan gunicorn
# WSGI worker, tapi ekspor ini berguna kalau ada tooling yang nyari
# `your_app:app` (mis. uvicorn `your_app:app`).
from main import app  # noqa: F401

# Best-effort WSGI shim:
# Beberapa platform deploy mendeteksi callable `wsgi` di module dan
# membungkusnya sendiri dengan ASGI runner. Kita re-export `app`
# sebagai `wsgi` supaya import-resolution tidak gagal. RUNTIME
# behavior tetap butuh ASGI worker (lihat Procfile / Dockerfile).
wsgi = app

# Alias umum lain biar fleksibel ke berbagai template platform
application = app
asgi_app = app

__all__ = ["app", "wsgi", "application", "asgi_app"]
