# STONES — Panduan Pengguna

**STONES** (Business Process Suite) adalah aplikasi web untuk **mengembangkan, mengelola, dan
menyimpan** Business Process (BP), SOP, dan dokumen perusahaan — plus asisten AI yang bisa
menjawab dan menganalisa proses kamu.

- **Buka aplikasi:** https://dhanyindraswara.github.io/bp_msbp/
- Butuh **login Google** (akses dikunci untuk akun yang diizinkan).
- Data tersimpan otomatis di cloud dan **realtime** — perubahan langsung tampil di semua device.

> Panduan ini untuk pengguna. Untuk sisi teknis, lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Mulai cepat

1. Buka link, klik **Continue with Google**, pilih akun.
2. Semua fitur ada di **sidebar kiri**, dikelompokkan:
   - **Dashboard** — ringkasan.
   - **Business Process** → Document Development, Document Import.
   - **Flow Process** → Auto Flow Process.
   - Lalu berdiri sendiri: Document Action Request, Repository, Global Search, Ask AI,
     AI Knowledge Base.
3. Semua editan **tersimpan otomatis** — tidak ada tombol "save" yang wajib dipencet.

---

## Menu-menu

### 📊 Dashboard
Ringkasan jumlah dokumen BP, jumlah versi, dan dokumen terakhir diperbarui. (Chart analitik
menyusul.)

### ✏️ Document Development — studio utama
Membuat Business Process dari **satu tabel SIPOC**. Ada 3 tampilan (tab di atas):

1. **SIPOC editor** — isi baris: **Supplier · Input · Process · Output · Customer** (1 baris = 1
   hubungan). Bisa tambah/hapus baris dan **paste langsung dari Excel**. Ada editor **PPI**
   (indikator kinerja) dan import `.xlsx`/`.csv`.
2. **Business Process Map** — diagram otomatis dari SIPOC: kotak proses, aktor (supplier/customer),
   panah in/out/handoff, dan title block ITM (logo, Prepared/Reviewed/Approved, BP No, revisi).
   - Klik field header atau logo untuk edit; **drag** kotak untuk atur posisi; **double-click**
     untuk rename; **Auto-arrange** untuk rapikan; toggle label **Flow #** / **Text**.
   - **Export PNG** (persis tampilan web) / **Export JSON**.
3. **RASCI** — matriks tanggung jawab (baris = sub-proses, kolom = aktor), terisi otomatis dan
   bisa dioverride per sel. **Export CSV / XLSX**.

**Document control:** tiap dokumen punya status **Draft → In Review → Approved → Published**,
**riwayat versi** (snapshot + restore), **audit trail**, dan **komentar** (lewat panel samping).
Bisa juga lampirkan file (PDF/PNG) dan share **deep-link** (`?doc=BP-xxxx`).

### 📥 Document Import — PDF jadi data terstruktur
Ubah PDF SOP/BP/policy jadi dokumen terstruktur:
1. Klik/drag **PDF** (maks ±7MB; hasil scan juga bisa).
2. AI (Gemini) membaca & mengekstrak isinya (biasanya 20–60 detik).
3. Muncul layar **review side-by-side** (PDF kiri, form kanan): metadata, tujuan/scope, aktor,
   langkah prosedur, RASCI, PPI. **Koreksi** yang salah.
4. **Simpan ke Repository** — tersimpan sebagai dokumen tipe **SOP**, PDF asli ikut dilampirkan.

### 🔀 Auto Flow Process — generator flowchart SOP
Bikin **flowchart swimlane** (kolom per pihak yang bertanggung jawab) otomatis. Kamu cukup isi
datanya, sistem yang menggambar sesuai template.

**Cara pakai:**
1. Isi **Kepala dokumen** (judul, level, BP No, tanggal, revisi, Prepared/Reviewed/Approved,
   logo) — section ini bisa dilipat biar ringkas.
2. Isi **Judul section** (nama proses, mis. "C3.2 Fuel Supply").
3. Isi **Lane / kolom** — satu pihak per baris, urut kiri → kanan.
4. Isi tabel **Langkah**: No, Tipe (Start/End, Process, Sub Process, Decision, dll), Lane, RASCI,
   Ref, Aktivitas, dan **Next**.
   - **Next** kosong = otomatis lanjut ke langkah berikutnya.
   - Untuk percabangan keputusan: tulis `6:Yes, 3:No` (ke langkah 6 kalau Yes, ke 3 kalau No).
5. **Preview** langsung tampil di kanan.

**Tips di preview:**
- **Drag** kotak untuk atur posisi manual; **double-click** untuk ganti nama aktivitas.
- **Rapikan ulang** mengembalikan semua kotak ke posisi otomatis.
- Uncheck **Kepala dokumen** untuk sembunyikan title block.
- **Export PNG** untuk hasil siap tempel.
- **Load sample** menampilkan contoh "C3.2 Fuel Supply" untuk mulai dari sana.

Flow tersimpan sebagai dokumen tipe **FLOW** dan bisa dibuka lagi untuk diedit.

### 🗂️ Repository
Daftar semua dokumen BP (ID, nama, versi, status, terakhir diperbarui). **Open** untuk membuka
di studio, **Duplicate**, atau **Delete**. Dokumen referensi (Knowledge Base) tidak muncul di sini.

### 🔍 Global Search
Cari lintas semua dokumen: nama, ID, isi SIPOC, aktor, flow, PPI, header, dan komentar. Klik hasil
untuk membuka dokumennya.

### ✦ Ask AI
Chat untuk **tanya, ringkas, dan analisa** Business Process kamu (bottleneck, gap, ownership,
PPI lemah, rekomendasi perbaikan). AI membaca **semua BP tersimpan** + **referensi aktif** di
AI Knowledge Base. Header menampilkan berapa referensi yang sedang dipakai.

Tips: makin lengkap SIPOC/PPI/SOP di dokumen, makin dalam analisanya. Jawaban mengikuti bahasa
pertanyaan (Indonesia/Inggris).

### 📚 AI Knowledge Base — sumber pengetahuan AI
Upload dokumen referensi agar Ask AI punya bahan tambahan saat menjawab.

**Cara pakai:**
1. Beri **judul** referensi.
2. **Upload PDF & ekstrak** (AI membaca isinya, scan pun bisa) — atau langsung **paste/ketik teks**.
3. Review/edit teksnya, lalu **Tambah ke knowledge base**.
4. Tiap referensi punya **toggle aktif/nonaktif** — hanya yang aktif yang dipakai AI. Bisa juga
   **Edit** atau **Hapus**.

Setelah itu buka **Ask AI** dan tanya seperti biasa — jawaban AI otomatis mempertimbangkan
referensi aktif.

### 📝 Document Action Request
Antrian permintaan review. Dokumen berstatus **In Review** bisa di-**Approve/Reject** di sini.
Ada juga tombol **+ New BP** untuk memulai dokumen baru.

---

## Tips & FAQ

- **Perlu klik simpan?** Tidak — editan tersimpan otomatis (autosave). Untuk BP, gunakan
  **Save version** kalau ingin snapshot yang bisa di-restore.
- **Kolaborasi realtime?** Ya. Perubahan dari device/orang lain langsung muncul.
- **Habis di-deploy tapi belum berubah?** GitHub Pages butuh ±1–2 menit. Lakukan **hard refresh**
  (Ctrl+Shift+R).
- **PDF scan bisa diimpor?** Bisa (AI membacanya), tapi hasil ekstraksi berupa data terstruktur —
  selalu **review** sebelum simpan.
- **Ask AI error "functions/not-found/unavailable"?** Biasanya Cloud Function `askAI` belum
  di-deploy atau secret `GEMINI_API_KEY` belum di-set (langkah admin, sekali saja).
- **Dokumen sensitif?** Free tier Gemini bisa dipakai Google untuk training — untuk dokumen
  sangat sensitif, pertimbangkan upgrade paid tier.

---

## Untuk admin / pengelola

- **Deploy web:** `npm run build` lalu `npm run deploy` (publish ke branch `gh-pages`).
- **Deploy Cloud Functions** (dari PC): `firebase deploy --only functions`.
- **Set API key AI:** `firebase functions:secrets:set GEMINI_API_KEY` (key gratis dari
  https://aistudio.google.com/apikey), lalu deploy functions.
- Detail teknis lengkap ada di [`ARCHITECTURE.md`](./ARCHITECTURE.md).
