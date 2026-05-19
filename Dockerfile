# ============================================================
#  ETING — Dockerfile (alternatif untuk Leapcell container mode)
# ============================================================
# Image ringan berbasis Python 3.11 slim, hanya ~50MB layer dasar.

FROM python:3.11-slim AS base

# Env yang membuat Python lebih ramah container
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install deps dulu supaya layer cache efektif
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Leapcell akan inject $PORT — kita expose default 8000
ENV PORT=8000
EXPOSE 8000

# Healthcheck (opsional, Leapcell juga punya health_check_url sendiri)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,os,sys; \
        port=os.environ.get('PORT','8000'); \
        sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=3).status==200 else 1)" \
        || exit 1

# Start command — sh -c supaya $PORT ter-expand
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
