# General Banking — AI Knowledge Hub (BFLP BRI)

Interactive Learning Directory + AI Knowledge Hub untuk 19 bab materi **General Banking Certification** (BFLP BRI, ±1.427 halaman). Dibuat 100% dengan HTML, CSS, dan JavaScript **client-side** — tidak butuh backend, bekerja offline.

---

## 🚀 Cara Menjalankan

### Opsi A — Klik dua kali (paling cepat)
Buka `index.html` langsung di browser (Chrome/Edge/Firefox). Semua data (indeks pencarian, glosarium, kuis, dll.) dimuat sebagai file `.js`, dan PDF ditampilkan lewat viewer bawaan browser, sehingga aplikasi berjalan tanpa server.

### Opsi B — Local server (disarankan untuk performa PDF terbaik)
```bash
cd app
python3 -m http.server 8080
# lalu buka http://localhost:8080
```
Atau: `npx serve` / ekstensi "Live Server" di VS Code.

> Catatan: Font Inter dimuat dari Google Fonts bila ada internet; tanpa internet aplikasi otomatis memakai font sistem.

---

## 📂 Struktur Folder
```
app/
├── index.html            # Shell single-page
├── README.md
├── css/
│   └── style.css         # Tema light/dark, layout responsive
├── js/
│   ├── store.js          # State + localStorage + recommendation engine (on-device ML)
│   ├── search.js         # Offline Knowledge Index: inverted index + BM25 + fuzzy + sinonim
│   ├── chat.js           # AI Tutor (RAG): retrieval offline + LLM opsional
│   ├── graph.js          # Concept graph force-directed (canvas, tanpa dependency)
│   ├── views.js          # Semua tampilan (directory, summary, quiz, flashcard, dsb.)
│   └── app.js            # Bootstrap, routing, sidebar, command palette, shortcut
├── data/                 # Dataset (di-generate dari PDF)
│   ├── search-index.js   # 1.427 chunk halaman (chapter+page+text)
│   ├── chapters.js       # Ringkasan, key takeaways, rumus, FAQ, checklist per bab
│   ├── glossary.js       # 46 istilah: definisi, sinonim, rumus, cross-reference
│   ├── quiz.js           # Bank soal (MCQ + True/False) + pembahasan + referensi halaman
│   ├── flashcards.js     # 84 flashcard bertingkat + spaced repetition
│   ├── graph.js          # Node & edge concept graph + relationship path
│   ├── synonyms.js       # Kamus sinonim/singkatan ID-EN untuk pencarian
│   └── chapters-meta.js  # Metadata bab (file, jumlah halaman)
└── assets/
    └── pdf/              # 19 file PDF materi asli
```

---

## ✨ Fitur
1. **Interactive Directory** — sidebar bab→sub-topik→halaman, collapse/expand, breadcrumb, progress %, bookmark, recent, favorit.
2. **PDF Viewer** — embed PDF, jump-to-page, zoom, seleksi & copy teks, search-in-PDF (viewer bawaan browser), sinkron dengan direktori.
3. **Global Search** — BM25 + fuzzy (typo) + sinonim/singkatan (CASA, DPK, NPL, LCR, …), highlight, preview, link langsung ke halaman.
4. **AI Chat (RAG)** — jawaban berbasis materi dengan sitasi Bab/halaman; menandai sumber PDF vs eksternal; jujur bila tidak ditemukan.
5. **AI Explanation Mode** — tombol Detailed / ELI5 / Technical / Example / Analogy / Case Study / Comparison / Flow di tiap istilah.
6. **Relationship Map & Concept Graph** — graph interaktif antar konsep (drag, zoom, klik).
7. **Smart Flashcard** — mode basic→expert, review, shuffle, spaced repetition (Leitner).
8. **Quiz Generator** — 10/20/50/100 soal, MCQ & True/False, pembahasan, referensi halaman, topik lemah + rekomendasi.
9. **Progress Dashboard** — bab selesai, halaman dibaca, skor, bookmark, riwayat cari, heatmap, streak, estimasi waktu.
10. **Smart Notes** — catatan bertag, tersimpan otomatis, export Markdown.
11. **On-device Learning** — melacak topik sering dibuka/salah/dicari lalu memberi rekomendasi & rencana review.
12. **UI/UX** — dark/light, responsive, animasi halus, command palette (Ctrl/Cmd+K), floating search, shortcut.

### ⌨️ Keyboard Shortcut
`Ctrl/Cmd + K` command palette · `/` fokus pencarian · `T` tema · `B` sidebar · `C` chat · `G` graph · `Q` kuis · `F` flashcard.

---

## 🤖 Mengaktifkan AI Generatif (opsional)
Default memakai **mode offline** (jawaban ekstraktif dari materi + sitasi halaman). Untuk RAG generatif penuh:
1. Klik ⚙ di panel AI Tutor (atau menu Pengaturan).
2. Isi **API Base URL** (OpenAI-compatible, mis. `https://api.openai.com/v1`), **API Key**, dan **Model** (mis. `gpt-4o-mini`).
3. Simpan. Sistem otomatis mengirim chunk paling relevan sebagai konteks (RAG) dan tetap menampilkan sitasi.

Kunci API hanya disimpan di `localStorage` browser Anda dan tidak dikirim ke mana pun selain endpoint yang Anda tentukan.

---

## ➕ Menambah Materi Baru
1. Taruh PDF baru di `assets/pdf/`.
2. Tambahkan entri pada daftar `CHAPTERS` di `build_index.py` lalu jalankan ulang `python3 build_index.py` dan `python3 emit_data.py` untuk memperbarui indeks.
3. (Opsional) tambah ringkasan bab di `author_chapters.py` dan istilah di `author_content.py`.

Arsitektur ini scalable untuk materi sertifikasi lain di masa depan.

---

## 🏗️ Arsitektur RAG
PDF → parse teks per halaman (`pdftotext`) → chunk (chapter+page) → inverted index + BM25 di browser → retrieve top-k saat bertanya → dijadikan konteks jawaban → sitasi halaman ditampilkan → referensi eksternal resmi ditambahkan hanya bila perlu & ditandai jelas. Slot embedding semantik disiapkan (dapat diaktifkan via endpoint AI).

© Materi General Banking oleh BRIDGE (PT Brilian Indah Gemilang) untuk BRILIAN FUTURE LEADER PROGRAM. Aplikasi ini alat bantu belajar pribadi.
