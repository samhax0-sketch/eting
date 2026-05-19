"""
============================================================
 ETING BACKEND - FastAPI Server
 Edukasi Interaktif Tenun dan Hukum (Anti Judol)
 SMK Negeri 18 Samarinda
============================================================

Server FastAPI yang melayani:
1. Static files (HTML, CSS, JS, gambar) — frontend ETING
2. REST API endpoints:
   - GET  /api/quiz/random         → ambil 1 soal kuis acak
   - GET  /api/quiz                → seluruh bank soal kuis
   - GET  /api/leaderboard         → leaderboard skor
   - POST /api/leaderboard         → submit skor pemain baru
   - GET  /api/materi              → daftar materi hukum
   - GET  /api/health              → status server

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
import random
import threading
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ============================================================
#  Setup paths
# ============================================================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

LEADERBOARD_FILE = DATA_DIR / "leaderboard.json"
_FILE_LOCK = threading.Lock()  # supaya tidak konflik tulis bersamaan


# ============================================================
#  Bank Data (mirror dari frontend agar mudah konsisten)
# ============================================================
QUESTIONS: List[dict] = [
    {
        "id": 1,
        "q": "Apa hukum bermain judi online di Indonesia?",
        "options": ["Boleh asal kecil", "Dilarang dan pidana", "Hanya pajak", "Bebas"],
        "correct": 1,
        "explain": "Judi online dilarang & dapat dipidana berdasarkan UU ITE Pasal 27 ayat (2).",
    },
    {
        "id": 2,
        "q": "Sanksi pidana bagi pelaku judi online (UU ITE) maksimal?",
        "options": ["1 tahun", "5 tahun", "10 tahun", "6 tahun"],
        "correct": 3,
        "explain": "Maksimal 6 tahun penjara dan/atau denda hingga Rp1 miliar.",
    },
    {
        "id": 3,
        "q": "Tenun khas Kalimantan Timur yang terkenal adalah?",
        "options": ["Tenun Ulos", "Tenun Sasirangan", "Tenun Sarung Samarinda", "Songket Palembang"],
        "correct": 2,
        "explain": "Sarung Samarinda adalah kerajinan tenun ikonik dari Kalimantan Timur.",
    },
    {
        "id": 4,
        "q": "Jika diajak main slot online oleh teman, sikap kamu?",
        "options": ["Ikut sedikit", "Tolak & ingatkan", "Diam saja", "Coba dulu"],
        "correct": 1,
        "explain": "Tolak dengan tegas & ingatkan bahaya judi online ke teman.",
    },
    {
        "id": 5,
        "q": "Dampak utama kecanduan judi online pada pelajar?",
        "options": ["Naik prestasi", "Hemat uang", "Rusak masa depan & utang", "Tambah teman"],
        "correct": 2,
        "explain": "Judi online merusak finansial, mental, & masa depan pelajar.",
    },
    {
        "id": 6,
        "q": "Motif khas tenun Dayak Kaltim biasanya bertema?",
        "options": ["Alam & hewan", "Robot", "Mobil", "Bangunan modern"],
        "correct": 0,
        "explain": "Motif tenun Dayak banyak terinspirasi flora, fauna, & alam.",
    },
    {
        "id": 7,
        "q": "Iklan judi online di sosmed sebaiknya?",
        "options": ["Di-klik", "Dibagikan", "Dilaporkan & blokir", "Diabaikan"],
        "correct": 2,
        "explain": "Laporkan ke platform agar konten judol diblokir & dihapus.",
    },
    {
        "id": 8,
        "q": "UU yang mengatur tindak pidana judi online di Indonesia?",
        "options": ["UU ITE", "UU Pajak", "UU Lalu Lintas", "UU Ketenagakerjaan"],
        "correct": 0,
        "explain": "UU ITE Pasal 27 ayat (2) mengatur larangan perjudian online.",
    },
    {
        "id": 9,
        "q": "Kenapa tenun perlu dilestarikan?",
        "options": ["Ikut tren", "Warisan budaya & ekonomi lokal", "Tugas wajib", "Gak penting"],
        "correct": 1,
        "explain": "Tenun adalah warisan budaya yang menghidupi ekonomi perajin lokal.",
    },
    {
        "id": 10,
        "q": "Slogan tepat melawan judi online?",
        "options": [
            "Coba dulu",
            "Stop Judol, Selamatkan Masa Depan!",
            "Untung kecil",
            "Hoki dulu",
        ],
        "correct": 1,
        "explain": "Stop Judol! Lindungi mental, finansial, & masa depan kita.",
    },
]

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
    """Baca file leaderboard.json, atau buat dari SEED kalau belum ada."""
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
    with _FILE_LOCK:
        with LEADERBOARD_FILE.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


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


class QuizAnswer(BaseModel):
    question_id: int
    chosen_index: int = Field(..., ge=0, le=3)


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


@app.get("/api/quiz", tags=["quiz"])
def list_quiz():
    """Ambil semua bank soal (untuk halaman admin/preview)."""
    return {"total": len(QUESTIONS), "items": QUESTIONS}


@app.get("/api/quiz/random", tags=["quiz"])
def random_quiz():
    """Ambil satu soal acak. Dipakai di game untuk popup kuis."""
    q = random.choice(QUESTIONS)
    return q


@app.post("/api/quiz/answer", tags=["quiz"])
def answer_quiz(payload: QuizAnswer):
    """Validasi jawaban pemain di sisi server (anti-cheat)."""
    q = next((x for x in QUESTIONS if x["id"] == payload.question_id), None)
    if not q:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    is_correct = payload.chosen_index == q["correct"]
    return {
        "correct": is_correct,
        "correct_index": q["correct"],
        "explain": q["explain"],
    }


@app.get("/api/materi", tags=["materi"])
def list_materi():
    """Daftar materi hukum yang ditampilkan di halaman materi-hukum.html."""
    return {"total": len(MATERI), "items": MATERI}


@app.get("/api/leaderboard", response_model=List[LeaderboardEntry], tags=["leaderboard"])
def get_leaderboard(limit: int = 10):
    """Ambil top-N leaderboard (default 10)."""
    data = _load_leaderboard()
    data_sorted = sorted(data, key=lambda x: x.get("score", 0), reverse=True)
    return data_sorted[: max(1, min(limit, 100))]


@app.post("/api/leaderboard", response_model=LeaderboardEntry, tags=["leaderboard"])
def submit_score(entry: ScoreSubmission):
    """Submit skor pemain baru ke leaderboard."""
    data = _load_leaderboard()
    new_entry = {
        "name": entry.name.strip(),
        "school": (entry.school or "").strip() or None,
        "score": int(entry.score),
        "created_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    data.append(new_entry)
    # Simpan hanya 500 entri teratas agar file tidak membengkak
    data = sorted(data, key=lambda x: x.get("score", 0), reverse=True)[:500]
    _save_leaderboard(data)
    return new_entry


# ============================================================
#  Static Files (frontend)
#  Pasang di paling akhir agar /api/* tidak ke-shadow.
#  /         → index.html
#  /img/...  → folder gambar
#  Sisanya   → file di root project
# ============================================================
@app.get("/", include_in_schema=False)
def root():
    return FileResponse(BASE_DIR / "index.html")


# Serve folder img/ langsung
if (BASE_DIR / "img").is_dir():
    app.mount("/img", StaticFiles(directory=BASE_DIR / "img"), name="img")


# Catch-all untuk file statis di root (styles.css, game.js, materi-hukum.html, dll.)
@app.get("/{filename:path}", include_in_schema=False)
def serve_static(filename: str):
    """
    Fallback untuk melayani file frontend di root project.
    Tidak akan ter-trigger untuk path yang sudah punya route lain
    (mis. /api/* atau /img/*).
    """
    # Cegah path traversal
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    target = (BASE_DIR / filename).resolve()
    try:
        target.relative_to(BASE_DIR)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if target.is_file():
        return FileResponse(target)
    # File tidak ada → 404 yang ramah
    return JSONResponse({"error": "not found", "path": filename}, status_code=404)


# ============================================================
#  Entry point untuk `python main.py` (dev convenience)
# ============================================================
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
