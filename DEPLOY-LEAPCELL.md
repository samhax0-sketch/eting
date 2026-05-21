# Deploy ETING Backend ke Leapcell

Panduan langkah demi langkah deploy server FastAPI ETING ke
[Leapcell](https://leapcell.io) — serverless cloud yang ramah Python.

---

## 🔥🔥🔥 PALING PENTING — Override Start Command di Dashboard 🔥🔥🔥

Default Start Command Leapcell adalah:
```
gunicorn --workers 1 --bind :8080 --timeout 600 your_app.wsgi
```

**Command ini SALAH** karena:
1. Pakai **titik** (`your_app.wsgi`) — gunicorn modern interpret ini sebagai
   `package.submodule`, bukan `module:attribute`. Yang benar pakai **titik dua**: `your_app:wsgi`.
2. Pakai `--worker-class sync` (default WSGI), tidak cocok untuk FastAPI (ASGI).

**KAMU WAJIB override di Leapcell dashboard:**

1. Buka **Leapcell dashboard → service kamu → Settings → Build & Deploy**
2. Cari field **Start Command** (atau **Run Command** / **Custom Start Command**)
3. **HAPUS** isi default, paste **SALAH SATU** dari command ini:

   **Opsi A (RECOMMENDED — pakai UvicornWorker, performa terbaik):**
   ```
   gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 600 --forwarded-allow-ips=*
   ```

   **Opsi B (kalau Opsi A masih bermasalah — pakai uvicorn langsung):**
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2 --forwarded-allow-ips=*
   ```

   **Opsi C (kalau dipaksa pakai WSGI shim — pakai TITIK DUA bukan titik):**
   ```
   gunicorn your_app:wsgi --workers 1 --bind 0.0.0.0:$PORT --timeout 600
   ```

4. **Build Command:**
   ```
   pip install --no-cache-dir -r requirements.txt
   ```

5. **Save** → klik **Redeploy** / **Trigger Manual Deploy**

> ⚠️ **Tanpa override ini, deployment akan FAIL terus** dengan error
> `ModuleNotFoundError: No module named 'your_app.wsgi'; 'your_app' is not a package`.
> Repo sudah punya `your_app.py`, `wsgi.py`, dan semua safety net, tapi
> Leapcell default command-nya memang invalid (titik vs titik dua).

---

##  BACA DULU — Fix Deploy Error `gunicorn: not found` / `your_app.wsgi`

Kalau kamu melihat log seperti ini di Leapcell:

```
+ gunicorn --workers 1 --bind :8080 --timeout 600 your_app.wsgi
./start_cmd_xxxx.sh: 5: gunicorn: not found
Server SHUTDOWN: failure
Runtime exited with error: exit status 127
```

**Penyebab:** Leapcell otomatis pakai **default template start command**
(`gunicorn ... your_app.wsgi`) yang dirancang untuk Django/Flask WSGI.
Default ini **tidak otomatis terganti** oleh `leapcell.toml` atau `Procfile`
di repo. Selain itu, `gunicorn` belum ter-install karena tidak ada di
`requirements.txt` versi lama.

**Repo ini sudah di-fix:**

1. `requirements.txt` sekarang sudah include `gunicorn==23.0.0`
2. `Procfile`, `leapcell.toml`, dan `Dockerfile` sudah pakai gunicorn +
   `UvicornWorker` (ASGI-compatible untuk FastAPI).

**Tapi kamu HARUS override Start Command di dashboard Leapcell:**

1. Buka **Leapcell dashboard → service kamu → Settings → Build & Deploy**.
2. Cari field **Start Command** (atau **Run Command**).
3. **Hapus** isi default-nya, paste persis ini:
   ```bash
   gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 600 --forwarded-allow-ips=*
   ```
4. **Build Command** (kalau juga kosong/salah):
   ```bash
   pip install --no-cache-dir -r requirements.txt
   ```
5. **Save** lalu klik **Redeploy** / **Trigger Manual Deploy**.

> 💡 **Kenapa pakai gunicorn + UvicornWorker, bukan uvicorn langsung?**
> Karena default template Leapcell **memang memanggil `gunicorn`** —
> jadi gunicorn harus ada. UvicornWorker membuat gunicorn jalan sebagai
> ASGI server (kompatibel FastAPI). Ini juga setup production-grade
> standar untuk FastAPI (lebih stabil dari uvicorn solo).

---

## 🚨 BACA KEDUA — Fix `OSError: Read-only file system: '/app/data'`

Kalau setelah fix gunicorn kamu lihat error baru:

```
File "/app/main.py", line 50, in <module>
    DATA_DIR.mkdir(exist_ok=True)
OSError: [Errno 30] Read-only file system: '/app/data'
```

**Penyebab:** Leapcell (seperti kebanyakan platform serverless) bikin
filesystem aplikasi **read-only** kecuali direktori `/tmp`. Jadi
`main.py` lama yang langsung `DATA_DIR.mkdir()` di `/app/data` akan
crash saat boot.

**Sudah di-fix di repo:** [`main.py`](main.py:55) sekarang punya
`_pick_data_dir()` yang nyoba beberapa lokasi berurutan:

1. `$LEAPCELL_DATA_DIR` / `$DATA_DIR` (kalau di-set di env)
2. `<repo>/data` (untuk lokal dev — writeable)
3. `/tmp/eting_data` (untuk Leapcell — selalu writeable di serverless)
4. **In-memory fallback** (`_MEMORY_LEADERBOARD`) — kalau semua di
   atas gagal, leaderboard cuma disimpan di RAM proses (tidak crash).

Setiap kandidat di-test dengan probe file `.write_test` sebelum dipakai.

**Log boot yang diharapkan setelah fix berhasil:**

```
[ETING] DATA_DIR=/tmp/eting_data persistent=True
[INFO] Starting gunicorn 23.0.0
[INFO] Booting worker with pid: ...
[INFO] Application startup complete.
```

### ⚠️ Catatan penting: `/tmp` itu **ephemeral**

`/tmp/eting_data` writeable, **tapi data leaderboard akan HILANG setiap
container restart / cold start**. Ini cocok untuk demo SMK / dev /
showcase, **tidak cocok untuk produksi serius**.

**Untuk persistensi sejati**, ganti storage backend ke salah satu:

- **S3 / R2 / Spaces** — set `LEAPCELL_DATA_DIR` ke mount point object
  storage (kalau Leapcell support volume mount).
- **Postgres / Supabase / Neon** — refactor `_load_leaderboard()` /
  `_save_leaderboard()` di [`main.py`](main.py:218) ke query SQL.
- **Redis / Upstash** — pakai key `eting:leaderboard` dengan JSON value.

Untuk demo SMK Negeri 18 Samarinda, in-memory + `/tmp` sudah cukup.

Selesai. Bagian di bawah ini adalah panduan lengkap untuk deploy awal.

---

## 1. Yang Sudah Disiapkan di Repo

| File | Fungsi |
|------|--------|
| `main.py` | Aplikasi FastAPI (entry point: `main:app`) |
| `requirements.txt` | Dependency Python (fastapi, uvicorn, **gunicorn**, pydantic) |
| `runtime.txt` | Versi Python (`python-3.11.9`) |
| `Procfile` | Start command (gunicorn + UvicornWorker) |
| `leapcell.toml` | Konfigurasi spesifik Leapcell (runtime, port, health check) |
| `Dockerfile` | Alternatif build container (kalau pilih mode "Container") |
| `.dockerignore` | Exclude file dari image |
| `.leapcellignore` | Exclude file dari upload Leapcell |
| `.gitignore` | Standard git ignore |

Semua sudah self-contained — push ke GitHub, sambungkan ke Leapcell,
override Start Command sekali, lalu jalan.

---

## 2. Persiapan Akun Leapcell

1. Daftar di **https://leapcell.io** (login via GitHub paling cepat).
2. Buat **Organization** (atau pakai default).
3. Pastikan kamu sudah punya repository project ini di GitHub/GitLab.

---

## 3. Cara Deploy — Pilih Salah Satu

### Cara A — Native Python Service (Recommended, paling cepat)

1. Di dashboard Leapcell klik **"Create Service" → "Service from Git"**.
2. Connect ke repository GitHub kamu, pilih repo ini.
3. Saat halaman config:
   - **Service Type**: `Web Service`
   - **Runtime**: `Python 3.11` (otomatis terbaca dari `runtime.txt`)
   - **Build Command**:
     ```bash
     pip install --no-cache-dir -r requirements.txt
     ```
   - **Start Command** (⚠️ **WAJIB DI-OVERRIDE** — jangan biarkan default):
     ```bash
     gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 600 --forwarded-allow-ips=*
     ```
   - **Port**: `8000` (Leapcell akan inject `$PORT` otomatis)
   - **Health Check**: `/api/health`
4. (Opsional) **Environment Variables**:
   - `PYTHONUNBUFFERED=1`
   - `PYTHONDONTWRITEBYTECODE=1`
5. Klik **Deploy**. Build pertama ~1–2 menit.

### Cara B — Container (Docker) Mode

1. **Create Service → Container**.
2. Connect ke repo yang sama; Leapcell akan auto-detect `Dockerfile`.
3. **Port**: `8000`, **Health Check**: `/api/health`.
4. Deploy. (Start command sudah di-hardcode di `Dockerfile` CMD,
   jadi tidak perlu override manual.)

Cara A lebih cepat & lebih murah resource. Cara B lebih portable kalau
kamu juga mau jalankan di tempat lain (Fly.io, Railway, dll.) dan
**lebih aman dari masalah default-template** karena CMD Dockerfile
selalu menang.

---

## 4. Setelah Deploy

Leapcell akan kasih kamu URL publik, misalnya:

```
https://eting-backend-xxxxx.leapcell.app
```

Coba endpoint ini:

| URL | Harus tampil |
|-----|--------------|
| `/` | Halaman beranda `index.html` |
| `/main-game.html` | Game ETING |
| `/materi-hukum.html` | Materi hukum |
| `/api/health` | `{"status": "ok", ...}` |
| `/api/quiz/random` | 1 soal kuis acak |
| `/api/leaderboard` | List skor (seed data awal) |
| `/docs` | Swagger UI interaktif (FastAPI auto-gen) |

---

## 5. ⚠️ Penting: Persistent Storage

Filesystem container Leapcell **EPHEMERAL** — `data/leaderboard.json`
akan **reset** setiap restart/redeploy. Untuk produksi, pilih salah satu:

### Opsi 1 — Leapcell Object Storage (Recommended)

1. Buat bucket di dashboard Leapcell → **Storage**.
2. Dapatkan: `LEAPCELL_S3_ENDPOINT`, `LEAPCELL_S3_ACCESS_KEY`,
   `LEAPCELL_S3_SECRET_KEY`, `LEAPCELL_S3_BUCKET`.
3. Tambahkan `boto3` ke `requirements.txt`:
   ```
   boto3==1.34.0
   ```
4. Refactor fungsi `_load_leaderboard()` & `_save_leaderboard()` di
   `main.py` untuk read/write ke S3 bucket (lihat contoh di bawah).

```python
# Snippet: ganti file-based JSON dengan S3
import boto3, json, os
s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["LEAPCELL_S3_ENDPOINT"],
    aws_access_key_id=os.environ["LEAPCELL_S3_ACCESS_KEY"],
    aws_secret_access_key=os.environ["LEAPCELL_S3_SECRET_KEY"],
)
BUCKET = os.environ["LEAPCELL_S3_BUCKET"]
KEY = "leaderboard.json"

def _load_leaderboard():
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=KEY)
        return json.loads(obj["Body"].read())
    except s3.exceptions.NoSuchKey:
        return []

def _save_leaderboard(data):
    s3.put_object(Bucket=BUCKET, Key=KEY,
                  Body=json.dumps(data, indent=2).encode())
```

### Opsi 2 — Leapcell Postgres/Redis

Pakai database managed Leapcell untuk leaderboard table:

```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Connection string disuntik via env var `DATABASE_URL`. Tambah `psycopg[binary]`
ke `requirements.txt`.

### Opsi 3 — Tetap pakai JSON (HANYA UNTUK DEMO)

Acceptable kalau tujuan deploy hanya untuk demo/presentasi sekolah —
leaderboard akan reset tiap deploy tapi tetap fungsional saat live.

---

## 6. Custom Domain (Opsional)

1. Di Leapcell dashboard service → **Settings → Custom Domain**.
2. Tambahkan `eting.smkn18-samarinda.sch.id` (atau domain apa pun).
3. Set CNAME record di DNS provider menunjuk ke
   `<service>.leapcell.app`.
4. Tunggu propagasi DNS (~5–30 menit) → SSL auto via Let's Encrypt.

---

## 7. Monitoring & Logs

- **Logs real-time**: dashboard Leapcell → tab **Logs**.
- **Metrics**: CPU, memory, request rate ada di tab **Metrics**.
- **Restart manual**: klik tombol **Restart** kalau perlu.

Untuk log lebih kaya, FastAPI sudah punya request logging bawaan uvicorn.
Bisa tingkatkan dengan tambah `loguru` ke `requirements.txt`.

---

## 8. Update Code

Setiap `git push` ke branch yang dimonitor Leapcell → auto re-deploy.
Tidak perlu CLI apa pun. Build ~1 menit, zero-downtime swap.

> ⚠️ **Catatan**: Override Start Command yang kamu set di dashboard
> akan tetap berlaku untuk semua deploy berikutnya — tidak perlu
> di-set ulang setiap push.

---

## 9. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `gunicorn: not found` di build log | Pastikan `gunicorn==23.0.0` ada di `requirements.txt` (repo ini sudah). Trigger rebuild. |
| `ModuleNotFoundError: No module named 'your_app'` | Default template Leapcell. **Override Start Command** di dashboard sesuai section 🚨 di atas. |
| `ModuleNotFoundError: fastapi` | Cek build log — pastikan `requirements.txt` ke-detect. Coba paksa rebuild. |
| `Failed to find attribute 'app' in 'main'` | Kamu lupa override Start Command, atau pakai entry point salah. Harus `main:app`. |
| Port binding error | Pastikan start command pakai `$PORT`, bukan port hardcoded. |
| `Worker failed to boot` / timeout | Naikkan `--timeout 600` di start command, atau cek apakah ada blocking I/O di startup `main.py`. |
| 502 Bad Gateway saat refresh | Health check `/api/health` mungkin lambat — naikkan `health_check_interval_seconds` di `leapcell.toml`. |
| Static file 404 | Pastikan folder `img/`, `*.html`, `*.css`, `*.js` ada di repo & ter-commit. |
| CORS error | Sudah handle di `main.py` (`CORSMiddleware allow_origins=["*"]`). Untuk produksi, ganti `["*"]` ke domain spesifik. |
| Leaderboard reset terus | Lihat section **#5 Persistent Storage** di atas. |

---

## 10. Cost Estimation (sebagai patokan)

Leapcell punya free tier yang cukup untuk demo sekolah:
- 256 MB RAM, 0.5 vCPU
- ~100k request / bulan gratis
- Object Storage 1 GB gratis

Untuk presentasi anti-judol di SMK, free tier **lebih dari cukup**.

> 💡 Dengan `--workers 2` di start command, free tier 256MB masih aman
> (~80–100MB per worker FastAPI). Kalau memory pressure muncul di
> Metrics, turunkan ke `--workers 1`.

---

## Ringkasan Cepat (TL;DR)

```bash
# 1. Pastikan semua file ter-commit
git add .
git commit -m "fix: leapcell — gunicorn + UvicornWorker"
git push origin main

# 2. Di leapcell.io:
#    - Create Service → from Git → pilih repo
#    - Runtime: Python 3.11 (auto-detect)
#    - Build:   pip install --no-cache-dir -r requirements.txt
#    - Start:   gunicorn main:app --workers 2 \
#               --worker-class uvicorn.workers.UvicornWorker \
#               --bind 0.0.0.0:$PORT --timeout 600 \
#               --forwarded-allow-ips=*
#    - Port:    8000
#    - Health:  /api/health
#    - Deploy

# 3. Kalau muncul `your_app.wsgi: not found` atau `gunicorn: not found`:
#    Dashboard → Settings → Build & Deploy → OVERRIDE Start Command
#    dengan command di atas, lalu Redeploy.

# 4. Buka URL → game ETING live di internet 🎉
```
