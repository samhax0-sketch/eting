"""
preprocess_sprite.py — One-time offline image preprocessing.

Tujuan:
  Mereplikasi algoritma chroma-key flood-fill yang sebelumnya berjalan di
  game.js (lines 395-499) sehingga sprite burung enggang sudah punya
  background transparan SEBELUM diupload ke Wix CDN.

  Dengan begitu, klien tidak perlu lagi melakukan pemrosesan berat
  (getImageData + BFS flood-fill + anti-alias) setiap kali load game.

Cara pakai:
  python tools/preprocess_sprite.py

Output:
  img/sprite_transparent.png   (sprite burung enggang dengan bg transparan)

  Sesudah itu upload file ini ke Wix CDN, lalu ganti URL sprite di game.js.
"""

import os
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    print("[ERROR] PIL/Pillow tidak terpasang. Jalankan: pip install Pillow")
    sys.exit(1)


# ---- Konfigurasi (samakan dengan konstanta di game.js) ----
WHITE_THRESH = 235            # pixel "putih" kalau min(R,G,B) >= 235
EDGE_ALIAS_MIN = 200          # pixel "hampir putih" untuk anti-alias edge
EDGE_ALIAS_RANGE = 40         # range untuk lerp alpha edge (200..240)
EDGE_ALIAS_STRENGTH = 0.75    # seberapa kuat menurunkan alpha di tepi

INPUT_PATH = os.path.join("img", "sprite.png")
OUTPUT_PATH = os.path.join("img", "sprite_transparent.png")


def is_white(r, g, b, thresh=WHITE_THRESH):
    return min(r, g, b) >= thresh


def remove_white_background(img: Image.Image) -> Image.Image:
    """Hapus background putih yang TERHUBUNG ke tepi gambar (flood-fill).

    Putih di TENGAH (mata, highlight) yang dikurung garis hitam akan
    TETAP dipertahankan — persis seperti algoritma di game.js.
    """
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    # Visited mask (1 = background luar)
    visited = bytearray(w * h)
    queue = deque()

    # Seed dari semua pixel tepi yang putih
    def seed_if_white(x, y):
        idx = y * w + x
        if visited[idx]:
            return
        r, g, b, _a = px[x, y]
        if is_white(r, g, b):
            visited[idx] = 1
            queue.append((x, y))

    for x in range(w):
        seed_if_white(x, 0)
        seed_if_white(x, h - 1)
    for y in range(h):
        seed_if_white(0, y)
        seed_if_white(w - 1, y)

    # BFS 4-connected
    while queue:
        x, y = queue.popleft()
        r, g, b, _a = px[x, y]
        # Set alpha = 0 untuk background luar
        px[x, y] = (r, g, b, 0)

        # Cek 4 tetangga
        neighbors = (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
        )
        for nx, ny in neighbors:
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            nidx = ny * w + nx
            if visited[nidx]:
                continue
            nr, ng, nb, _na = px[nx, ny]
            if is_white(nr, ng, nb):
                visited[nidx] = 1
                queue.append((nx, ny))

    # Anti-alias edge: turunkan alpha pixel hampir-putih yang bertetangga
    # dengan pixel transparan. Menghaluskan tepi (no "halo putih").
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            idx = y * w + x
            if visited[idx]:
                continue  # sudah transparan
            r, g, b, a = px[x, y]
            min_rgb = min(r, g, b)
            if min_rgb < EDGE_ALIAS_MIN:
                continue  # bukan hampir-putih
            # Cek ada tetangga transparan?
            n_transparent = (
                visited[idx - 1]
                or visited[idx + 1]
                or visited[idx - w]
                or visited[idx + w]
            )
            if n_transparent:
                t = min(1.0, (min_rgb - EDGE_ALIAS_MIN) / EDGE_ALIAS_RANGE)
                new_a = int(round(a * (1.0 - t * EDGE_ALIAS_STRENGTH)))
                px[x, y] = (r, g, b, new_a)

    return img


def crop_transparent_padding(img: Image.Image) -> Image.Image:
    """Crop padding transparan supaya bounding box pas dengan konten."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    return img.crop(bbox)


def main():
    if not os.path.exists(INPUT_PATH):
        print(f"[ERROR] File tidak ditemukan: {INPUT_PATH}")
        sys.exit(1)

    print(f"[1/4] Membuka {INPUT_PATH}...")
    src = Image.open(INPUT_PATH)
    print(f"      Ukuran asli: {src.size[0]}x{src.size[1]}")

    print("[2/4] Menghapus background putih (flood-fill dari tepi)...")
    out = remove_white_background(src)

    print("[3/4] Crop padding transparan...")
    cropped = crop_transparent_padding(out)
    print(f"      Ukuran setelah crop: {cropped.size[0]}x{cropped.size[1]}")

    print(f"[4/4] Menyimpan ke {OUTPUT_PATH}...")
    cropped.save(OUTPUT_PATH, "PNG", optimize=True)

    in_size = os.path.getsize(INPUT_PATH)
    out_size = os.path.getsize(OUTPUT_PATH)
    print()
    print("=" * 60)
    print("SELESAI!")
    print(f"  Input  : {INPUT_PATH}  ({in_size / 1024:.1f} KB)")
    print(f"  Output : {OUTPUT_PATH}  ({out_size / 1024:.1f} KB)")
    print("=" * 60)
    print()
    print("Langkah berikutnya:")
    print(f"  1. Upload {OUTPUT_PATH} ke Wix Media Manager.")
    print("  2. Salin URL Wix CDN-nya (format: https://static.wixstatic.com/media/...).")
    print("  3. Ganti URL spriteImg.src di game.js dengan URL baru itu.")
    print("  4. Jadi klien tidak perlu lagi chroma-key runtime (lebih ringan).")


if __name__ == "__main__":
    main()
