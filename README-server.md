# ETING Backend — FastAPI Server

Server backend untuk **ETING — Edukasi Interaktif Tenun dan Hukum (Anti Judol)**
karya SMK Negeri 18 Samarinda.

Server ini sekaligus:
- Menyajikan halaman frontend statis ([`index.html`](index.html), [`main-game.html`](main-game.html), [`materi-hukum.html`](materi-hukum.html), aset di [`img/`](img))
- Menyediakan REST API untuk leaderboard, kuis, dan materi hukum

---

## 🚀 Cara Menjalankan

### 1. Install dependency

Pastikan Python **3.10+** terpasang. Lalu di terminal:

```bash
pip install -r requirements.txt
```

Atau lebih aman pakai virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows (cmd)
# .venv\Scripts\Activate.ps1     # Windows (PowerShell)
# source .venv/bin/activate      # Linux/Mac

pip install -r requirements.txt
```

### 2. Jalankan server

**Cara 1 — pakai uvicorn langsung (rekomendasi dev):**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Cara 2 — jalan langsung dari Python:**
```bash
python main.py
```

### 3. Buka di browser

| URL | Halaman |
|---|---|
| http://localhost:8000/ | Beranda ETING |
| http://localhost:8000/main-game.html | Halaman main game |
| http://localhost:8000/materi-hukum.html | Halaman materi hukum |
| http://localhost:8000/docs | **Swagger UI** — dokumentasi API interaktif |
| http://localhost:8000/redoc | ReDoc — versi dokumentasi alternatif |

---

## 📚 Daftar Endpoint API

Semua endpoint diawali `/api/`.

### Meta

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Cek server hidup |

### Quiz

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/quiz` | Semua bank soal |
| `GET` | `/api/quiz/random` | Satu soal acak |
| `POST` | `/api/quiz/answer` | Validasi jawaban (anti-cheat) |

Contoh body `POST /api/quiz/answer`:
```json
{
  "question_id": 1,
  "chosen_index": 1
}
```

### Materi Hukum

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/materi` | Daftar undang-undang yang melarang judol |

### Leaderboard

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/leaderboard?limit=10` | Top-N skor (default 10, max 100) |
| `POST` | `/api/leaderboard` | Submit skor baru |

Contoh body `POST /api/leaderboard`:
```json
{
  "name": "Rama",
  "school": "SMK Negeri 18 Samarinda",
  "score": 1850
}
```

---

## 💾 Penyimpanan Data

Leaderboard disimpan ke file [`data/leaderboard.json`](data/leaderboard.json).
File ini akan otomatis dibuat saat server pertama kali dijalankan, dan diisi
seed data 5 pemain dummy supaya tampilan langsung ada datanya.

> ⚠️ Untuk produksi, ganti penyimpanan ini dengan database (SQLite/PostgreSQL).

---

## 🧪 Contoh Pemakaian dari Frontend (JavaScript)

```js
// Ambil leaderboard
const res = await fetch('/api/leaderboard?limit=5');
const top5 = await res.json();
console.log(top5);

// Submit skor saat game over
await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'Pemain',
        school: 'SMK 18 Samarinda',
        score: 1234
    })
});

// Tarik soal kuis dari server (anti-cheat)
const q = await fetch('/api/quiz/random').then(r => r.json());

// Kirim jawaban untuk divalidasi server
const result = await fetch('/api/quiz/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: q.id, chosen_index: 1 })
}).then(r => r.json());
console.log(result.correct, result.explain);
```

---

## 🗂️ Struktur File

```
ting/
├── main.py                # FastAPI app
├── requirements.txt       # Python dependencies
├── README-server.md       # Dokumentasi ini
├── data/
│   └── leaderboard.json   # auto-generated saat run pertama
├── index.html             # halaman beranda
├── main-game.html         # halaman game
├── materi-hukum.html      # halaman materi hukum
├── styles.css
├── materi-hukum.css
├── game.js
├── script.js
└── img/...
```

---

## 🛠️ Tips Deployment

- **Port:** secara default `8000`. Bisa diganti via env var `PORT`.
- **Production:** gunakan `uvicorn` tanpa `--reload` plus `--workers 2`.
- **HTTPS:** taruh di belakang reverse proxy (Nginx/Caddy/Traefik).
- **CORS:** saat ini `allow_origins=["*"]`. Kalau frontend dipisah ke domain
  berbeda di production, batasi ke domain spesifik di [`main.py`](main.py).
