# LEAP-STONES — Product Redesign (2026)

Dokumen arah redesign STONES dari "kumpulan menu" menjadi platform Business
Process Management yang terasa seperti enterprise SaaS modern (Linear/Notion
level polish), untuk pengguna non-teknis di perusahaan tambang.

## Visi produk

STONES = platform sentral untuk Business Process, dokumen, pengetahuan
organisasi, governance, dan continuous improvement. Prinsip pengalaman:

1. **Pengguna selalu tahu** di mana dia, apa yang sedang dilihat, dan apa
   langkah berikutnya.
2. **Mencari lebih cepat daripada menelusuri folder** — search adalah pintu
   utama, bukan fitur pinggiran.
3. **Proses adalah jantung** — dokumen, RASCI, flowchart, dan taxonomy adalah
   proyeksi dari satu model proses, bukan modul terpisah.
4. **Minimal, lapang, percaya diri** — whitespace generous, tipografi jelas,
   animasi halus dan bertujuan; bukan ERP tradisional.

## Yang sudah dikerjakan di fase ini

### 1. Landing page publik (`src/Landing.jsx`)
Halaman pra-login yang menjual cerita, gaya modern-SaaS:
- Hero "Era baru operasional tambang, dengan STONES™" + maskot **haul truck
  HD** (SVG animasi: melayang, roda berputar, asap, debu, lampu) dengan callout
  monospace ala produk AI modern (GOVERNANCE 24/7, SINGLE SOURCE OF TRUTH,
  AI-POWERED IMPORT).
- Section "keruwetan": benang kusut (SVG ter-animate saat scroll) penuh file
  XLS/DOC/PDF/VSD dan pertanyaan tanpa jawaban → masuk node STONES → keluar
  sebagai satu alur proses lurus. Tiga kolom pain: pindah-pindah aplikasi,
  pengetahuan tak terdokumentasi, jam terbuang mencari.
- Grid 6 kemampuan platform, "3 langkah" cara kerja, CTA band gelap, footer.
- Semua animasi hormat pada `prefers-reduced-motion`.

### 2. Login baru (`src/Login.jsx`)
Layar gelap minimal: orb gradien beranimasi + dot grid, glass card, satu aksi
(Continue with Google), link kembali ke beranda. Login lama (split hero) dihapus.

### 3. Information architecture baru (shell `App.jsx`)
Navigasi dikelompokkan berdasar *apa yang sedang dilakukan pengguna*, bukan
sejarah modul:

| Grup | Isi | Job-to-be-done |
|---|---|---|
| Dashboard | Dashboard | orientasi harian |
| **Proses** | Process Architecture, Process Taxonomy, High Level Process, Taxonomy Description | memahami & memetakan arsitektur proses |
| **Studio** | Document Development, Document Import, Auto Flow Process | membuat & mengimpor dokumen |
| **Library** | Repository, Global Search, Action Request | menemukan & meminta |
| **Intelligence** | Ask AI, AI Knowledge Base | bertanya & memberi konteks AI |

### 4. Search sebagai pengalaman inti
- **Command palette Ctrl/⌘+K** (`src/components/CommandPalette.jsx`): lompat ke
  menu mana pun, buka dokumen berdasarkan nama/ID/tipe/status, atau lempar query
  ke Global Search untuk full-text. Keyboard-first (↑↓ ↵ Esc).
- Pill "Cari…" permanen di atas sidebar sebagai pintu masuk yang discoverable
  untuk pengguna non-teknis.
- Global Search menerima seed query dari palette (`initialQuery`).

## Roadmap (belum dikerjakan — urut prioritas)

1. **Home hub** — ganti Dashboard jadi "hari ini": dokumen menunggu approval
   saya, draft saya, aktivitas tim, pintasan lanjutkan-kerja.
2. **Process Explorer** — jadikan BP Architecture pintu masuk utama: klik node
   L0→L3 langsung preview dokumen/SIPOC/flow terkait di panel samping
   (drill-down tanpa pindah menu).
3. **Dokumen ⇄ proses sebagai relasi kelas satu** — setiap dokumen menempel ke
   node arsitektur; Repository bisa difilter "semua dokumen di bawah proses X".
4. **Unifikasi Studio** — satu tombol "Buat baru" (BP / SOP / Flow / Taxonomy)
   menggantikan pemisahan menu per tipe; editor menyesuaikan tipe.
5. **RBAC ringan** — role admin/approver/viewer di atas Google auth.
6. **Rekomendasi & recent** — "sering dibuka", "terkait dengan yang Anda baca",
   riwayat pencarian di palette.

## Catatan teknis

- Tidak ada dependency baru; semua animasi CSS + IntersectionObserver.
- Palet brand landing: gradien `#ff7a1a → #f0439c → #2f8bff` (mark, ikon,
  headline accent) di atas warm paper `#fbfaf7`; app shell tetap ITM blue.
- Deploy tetap `npm run build` + `npm run deploy` (gh-pages) setelah merge.


## Update 2 — Rebrand LEAP-STONES + identitas ITMG (Banpu guide)

- **Rename** STONES → **LEAP-STONES** di seluruh produk: landing, login, sidebar,
  loading screen, browser title, favicon, meta description, prompt AI, package.json.
- **Palet** dari ITMG/Banpu Color Guide: Banpu Blue `#00AEEF`, Purple Blue `#484792`,
  Green `#00B49C`, Black `#232127`, greys — dipetakan ke design tokens (`--accent`
  fungsional `#0084c6` agar kontras AA, `--accent-bright/deep/green/ink`).
- **Brand mark** baru: leaf-swoosh (motif guide) putih di atas tile gradien blue→purple
  (`BrandMark.jsx` + favicon SVG).
- **Tipografi**: Plus Jakarta Sans untuk heading/brand (`--font-display`), Inter body.
- **Hero visual baru** (menggantikan ilustrasi truk): "product canvas" — kartu glass
  berisi peta value chain tambang yang tergambar animatif (node muncul berurutan,
  konektor menggambar sendiri) + floating proof-cards (Approved, RASCI, Ask AI), di
  atas backdrop leaf-swoosh gradien translusen. Kesan: mining company yang sedang
  bertransformasi digital, bukan industrial berat.
- **Bahasa**: seluruh copy UI kini bahasa Inggris.
