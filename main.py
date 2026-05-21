"""
============================================================
 ETING BACKEND - FastAPI Server
 Edukasi Interaktif Tenun dan Hukum (Anti Judol)
 SMK Negeri 18 Samarinda
============================================================

Server FastAPI yang melayani:
   - GET  /api/leaderboard         → leaderboard skor
   - POST /api/leaderboard         → submit skor pemain baru
   - GET  /api/materi              → daftar materi hukum
   - GET  /api/health              → status server
   - GET  /                        → index.html (SEMENTARA, buat preview lokal)
   - GET  /{path}                  → file statis (HTML/CSS/JS) di project root

Catatan penting:
- Kuis (soal + random + validasi) sepenuhnya di frontend (game.js).
- Static file serving (HTML/CSS/JS) di sini SEMENTARA untuk preview lokal.
  Nanti frontend akan di-host di Wix (full CDN), saat itu blok static
  serving di bawah bisa dihapus dan server jadi pure API-only.
- Asset img/sound sudah pakai Wix CDN langsung dari HTML/JS — server ini
  TIDAK lagi nge-serve folder img/ atau sound/.

Penyimpanan: file JSON sederhana (`data/leaderboard.json`)
agar mudah dipakai tanpa setup database.

Cara jalanin:
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Lalu buka:  http://localhost:8000
Docs API :  http://localhost:8000/docs
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# ============================================================
#  Setup paths
# ============================================================
BASE_DIR = Path(__file__).resolve().parent

# Pilih DATA_DIR yang writeable:
#   1. ENV LEAPCELL_DATA_DIR (kalau di-set manual via dashboard)
#   2. BASE_DIR/data (development lokal)
#   3. /tmp/eting_data (Leapcell / serverless — filesystem app read-only,
#      hanya /tmp yang writeable, tapi ephemeral antar request)
#   4. Fallback in-memory (kalau /tmp pun gagal — leaderboard akan reset
#      setiap restart container)
def _pick_data_dir() -> tuple[Path, bool]:
    """Return (DATA_DIR, is_persistent). is_persistent=False berarti
    pakai memory fallback (tidak nulis file sama sekali)."""
    candidates = []
    env_dir = os.environ.get("LEAPCELL_DATA_DIR") or os.environ.get("DATA_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    candidates.append(BASE_DIR / "data")
    candidates.append(Path("/tmp") / "eting_data")
    for cand in candidates:
        try:
            cand.mkdir(parents=True, exist_ok=True)
            # Test write permission dengan probe file
            probe = cand / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return cand, True
        except (OSError, PermissionError):
            continue
    # Semua kandidat gagal — pakai in-memory storage
    return BASE_DIR, False


DATA_DIR, _STORAGE_PERSISTENT = _pick_data_dir()
LEADERBOARD_FILE = DATA_DIR / "leaderboard.json"
_FILE_LOCK = threading.Lock()  # supaya tidak konflik tulis bersamaan

# In-memory fallback storage (dipakai kalau filesystem 100% read-only)
_MEMORY_LEADERBOARD: List[dict] = []

print(
    f"[ETING] DATA_DIR={DATA_DIR} persistent={_STORAGE_PERSISTENT}",
    flush=True,
)


# ============================================================
#  Bank Data
# ============================================================
# CATATAN: bank soal kuis (QUESTIONS) sengaja TIDAK disimpan di server.
# Kuis sepenuhnya di-handle di frontend (lihat `game.js` → const QUESTIONS),
# termasuk pemilihan acak (Math.random) & validasi jawaban — supaya server
# benar-benar ringan (hanya hosting + leaderboard + materi).

MATERI: List[dict] = [
    {
        "id": "uu-ite",
        "label": "UU ITE",
        "title": "UU No. 19 Tahun 2016 — Pasal 27 ayat (2)",
        "text": "Melarang setiap orang dengan sengaja mendistribusikan, mentransmisikan, atau membuat dapat diaksesnya informasi elektronik yang bermuatan perjudian.",
        "ancaman": "6 tahun penjara & denda hingga Rp1 miliar",
    },
    {
        "id": "kuhp-303",
        "label": "KUHP",
        "title": "Pasal 303 KUHP",
        "text": "Mengatur sanksi bagi pihak yang menyediakan tempat, fasilitas, atau menjadi bandar perjudian dengan sengaja sebagai mata pencaharian.",
        "ancaman": "10 tahun penjara & denda Rp25 juta",
    },
    {
        "id": "uu-7-1974",
        "label": "UU Penertiban",
        "title": "UU No. 7 Tahun 1974",
        "text": "Tentang Penertiban Perjudian. Menegaskan bahwa semua bentuk perjudian adalah kejahatan, termasuk yang dikemas modern lewat aplikasi atau website.",
        "ancaman": "Semua perjudian = tindak pidana",
    },
    {
        "id": "tppu",
        "label": "TPPU",
        "title": "UU No. 8 Tahun 2010 — TPPU",
        "text": "Uang hasil judi online termasuk hasil tindak pidana. Mencairkan, mengirim, atau menerima dana terkait judi bisa dikenakan pasal TPPU.",
        "ancaman": "Hingga 20 tahun penjara",
    },
]

# Leaderboard seed jika file belum ada
SEED_LEADERBOARD: List[dict] = [
    {"name": "Nadya A.", "school": "SMA 10 Samarinda", "score": 2560, "created_at": "2024-09-01T08:00:00"},
    {"name": "Raihan F.", "school": "SMA 2 Samarinda", "score": 2230, "created_at": "2024-09-01T08:00:00"},
    {"name": "Aisyah N.", "school": "SMA 1 Samarinda", "score": 2010, "created_at": "2024-09-01T08:00:00"},
    {"name": "Bima P.", "school": "SMA 10 Samarinda", "score": 1780, "created_at": "2024-09-01T08:00:00"},
    {"name": "Keisha L.", "school": "SMA 3 Samarinda", "score": 1540, "created_at": "2024-09-01T08:00:00"},
]


# ============================================================
#  Persistence Helpers
# ============================================================
def _load_leaderboard() -> List[dict]:
    """Baca file leaderboard.json, atau buat dari SEED kalau belum ada.
    Kalau filesystem read-only, pakai in-memory storage."""
    global _MEMORY_LEADERBOARD

    # In-memory mode (filesystem 100% read-only)
    if not _STORAGE_PERSISTENT:
        if not _MEMORY_LEADERBOARD:
            _MEMORY_LEADERBOARD = list(SEED_LEADERBOARD)
        return list(_MEMORY_LEADERBOARD)

    # File-based mode
    if not LEADERBOARD_FILE.exists():
        _save_leaderboard(SEED_LEADERBOARD)
        return list(SEED_LEADERBOARD)
    try:
        with LEADERBOARD_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return list(SEED_LEADERBOARD)
            return data
    except (json.JSONDecodeError, OSError):
        # File rusak — fallback ke seed
        return list(SEED_LEADERBOARD)


def _save_leaderboard(data: List[dict]) -> None:
    """Tulis leaderboard ke disk; fallback ke memory kalau filesystem
    read-only atau write gagal."""
    global _MEMORY_LEADERBOARD

    # In-memory mode
    if not _STORAGE_PERSISTENT:
        _MEMORY_LEADERBOARD = list(data)
        return

    # File-based mode (best-effort, tidak crash kalau gagal)
    try:
        with _FILE_LOCK:
            with LEADERBOARD_FILE.open("w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except OSError as e:
        # Filesystem tiba-tiba read-only saat runtime — switch ke memory
        print(f"[ETING] WARN: gagal tulis leaderboard ({e}), fallback memory", flush=True)
        _MEMORY_LEADERBOARD = list(data)


# ============================================================
#  Pydantic Models
# ============================================================
class ScoreSubmission(BaseModel):
    name: str = Field(..., min_length=1, max_length=32, description="Nama pemain")
    school: Optional[str] = Field(None, max_length=64, description="Asal sekolah (opsional)")
    score: int = Field(..., ge=0, le=1_000_000, description="Skor akhir game")


class LeaderboardEntry(BaseModel):
    name: str
    school: Optional[str] = None
    score: int
    created_at: str


# ============================================================
#  FastAPI App
# ============================================================
app = FastAPI(
    title="ETING API",
    description="Backend untuk Edukasi Interaktif Tenun dan Hukum (Anti Judol)",
    version="1.0.0",
)

# CORS (kalau frontend di-host terpisah dari API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  API Endpoints
# ============================================================
@app.get("/api/health", tags=["meta"])
def health():
    """Cek apakah server hidup."""
    return {"status": "ok", "service": "eting-api", "time": datetime.utcnow().isoformat()}


# Catatan: endpoint /api/quiz, /api/quiz/random, /api/quiz/answer sengaja
# dihapus. Kuis (soal, random, validasi) sekarang sepenuhnya di JS frontend
# untuk meringankan server. Lihat `showQuiz()` & `answerQuiz()` di game.js.


@app.get("/api/materi", tags=["materi"])
def list_materi():
    """Daftar materi hukum yang ditampilkan di halaman materi-hukum.html."""
    return {"total": len(MATERI), "items": MATERI}


# Catatan: endpoint /api/leaderboard (GET + POST) sengaja dihapus.
# Leaderboard sekarang langsung baca/tulis ke Supabase dari frontend
# (lihat assets/js/supabase-client.js + window.EtingDB). Server Leapcell
# tidak perlu lagi load/save file leaderboard.json — hilangkan I/O disk &
# beban CPU. Endpoint stub 410 Gone biar client lama tahu harus update.

@app.get("/api/leaderboard", include_in_schema=False)
def get_leaderboard_gone():
    raise HTTPException(
        status_code=410,
        detail="Endpoint dipindah ke Supabase langsung. Update klien.",
    )


@app.post("/api/leaderboard", include_in_schema=False)
def submit_score_gone():
    raise HTTPException(
        status_code=410,
        detail="Endpoint dipindah ke Supabase langsung. Update klien.",
    )


# ============================================================
#  Static file serving (SEMENTARA - untuk preview lokal)
# ============================================================
#  Blok ini melayani HTML/CSS/JS dari project root supaya bisa buka
#  http://localhost:8000/ langsung di browser tanpa server lain.
#
#  HAPUS blok ini saat frontend sudah di-host di Wix CDN.
#  Mount /img dan /sound TIDAK dipasang karena semua asset sudah pakai
#  Wix CDN langsung dari HTML/JS.
# ============================================================
# File-file frontend yang boleh di-serve (whitelist biar aman)
_ALLOWED_STATIC_FILES = {
    "index.html",
    "main-game.html",
    "materi-hukum.html",
    "puzzle-menenun.html",
    "styles.css",
    "materi-hukum.css",
    "script.js",
    "game.js",
    "mini-games.js",
    # Modul JS terpisah di folder assets/js/
    "assets/js/page-loader.js",
    "assets/js/supabase-client.js",
    "assets/js/wix-image-loader.js",
    "assets/js/eting-confirm.js",
}


@app.get("/", include_in_schema=False)
def root_index():
    """Serve index.html (sementara, untuk preview lokal)."""
    index_path = BASE_DIR / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="index.html tidak ditemukan")
    return FileResponse(index_path)


@app.get("/{filename:path}", include_in_schema=False)
def serve_static(filename: str):
    """Serve HTML/CSS/JS dari project root (sementara, untuk preview lokal).

    Cuma file di whitelist `_ALLOWED_STATIC_FILES` yang dilayani — selain
    itu balikin 404 supaya gak bisa dipakai buat path traversal atau
    bocor file sensitif.
    """
    # Tolak path traversal (.., absolute path, dll)
    if ".." in filename or filename.startswith("/") or "\\" in filename:
        raise HTTPException(status_code=404, detail="Not Found")

    if filename not in _ALLOWED_STATIC_FILES:
        raise HTTPException(status_code=404, detail="Not Found")

    file_path = BASE_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Not Found")

    return FileResponse(file_path)


# ============================================================
#  Entry point untuk `python main.py` (dev convenience)
# ============================================================
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
