"""
wsgi.py — Standalone WSGI entrypoint untuk platform yang nyari `wsgi.py`.

Sebagian platform (Render, Railway, beberapa template Leapcell) default
mencari file `wsgi.py` di root dengan callable `application`. File ini
sediakan itu sebagai alias dari `your_app`.

Pakai ini dengan command:
    gunicorn wsgi:application
    atau
    gunicorn wsgi:app

Tapi REKOMENDASI utama tetap pakai UvicornWorker:
    gunicorn main:app --worker-class uvicorn.workers.UvicornWorker
"""
from __future__ import annotations

from your_app import app, wsgi, application

# Re-export biar `gunicorn wsgi:application` atau `gunicorn wsgi:app` work
__all__ = ["app", "wsgi", "application"]
